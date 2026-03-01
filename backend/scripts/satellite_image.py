import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta
import requests
from requests_toolbelt.multipart.decoder import MultipartDecoder
from io import BytesIO
from PIL import Image
from cresco.config import Settings, get_settings
from scripts.drone_image import sat_compute_ndvi_image



async def process_satellite_images(nir_bytes: bytes, rgb_bytes: bytes):

	print("Processing satellite images to compute NDVI...")  # Debug log

	result_bytes = sat_compute_ndvi_image(rgb_bytes, nir_bytes, save_to_disk=False)["image_bytes"]
	print("NDVI image processing complete. Result bytes length:", len(result_bytes) if result_bytes else 0)  # Debug log

	# try: - debug print
	# 	import matplotlib.pyplot as plt
	# 	from PIL import Image
	# 	import numpy as np
	# 	print("\nDisplaying and printing stats for in-memory red_tiff and nir_tiff (close image window to continue)...")
	# 	for tiff_bytes, band_name in zip([result_bytes], ["Red Band TIFF (B04)", "NIR Band TIFF (B08)"]):
	# 		img = Image.open(BytesIO(tiff_bytes))
	# 		arr = np.array(img)
	# 		print(f"{band_name} - shape: {arr.shape}, dtype: {arr.dtype}, min: {arr.min()}, max: {arr.max()}")
	# 		# Normalize for display if not all 0
	# 		arr_disp = arr
	# 		if arr.max() > arr.min():
	# 			arr_disp = (arr - arr.min()) / (arr.max() - arr.min())
	# 		plt.imshow(arr_disp, cmap='gray')
	# 		plt.title(band_name)
	# 		plt.axis('off')
	# 		plt.show()
	# except ImportError:
	# 	print("matplotlib, PIL, or numpy not installed. Install them to view TIFFs in Python.")



	
	return result_bytes





def convert_tiff_to_png(tiff_bytes):
	"""Convert GeoTIFF bytes to PNG bytes."""
	try:
		with BytesIO(tiff_bytes) as tiff_io:
			img = Image.open(tiff_io)
			with BytesIO() as png_io:
				img.convert("RGB").save(png_io, format="PNG")
				return png_io.getvalue()
	except Exception as e:
		print(f"Error converting TIFF to PNG: {e}")
		return None

async def satellite_images_main(lat, lon):
	"""
	Main function: receives user_id, gets farm bbox and satellite images, converts to JPEGs, calls process_satellite_images.
	"""
	# Get satellite images (GeoTIFF)
	try:
		red_tiff, nir_tiff = await get_satellite_images(lat, lon)
		if not red_tiff or not nir_tiff:
			print("Failed to fetch satellite images.")
			return


		# Convert to PNG
		# red_png = convert_tiff_to_png(red_tiff)
		# nir_png = convert_tiff_to_png(nir_tiff)

		# Print and display the in-memory red_tiff and nir_tiff before conversion - edbug prints
		# try:
		# 	import matplotlib.pyplot as plt
		# 	from PIL import Image
		# 	import numpy as np
		# 	print("\nDisplaying and printing stats for in-memory red_tiff and nir_tiff (close image window to continue)...")
		# 	for tiff_bytes, band_name in zip([red_tiff, nir_tiff], ["Red Band TIFF (B04)", "NIR Band TIFF (B08)"]):
		# 		img = Image.open(BytesIO(tiff_bytes))
		# 		arr = np.array(img)
		# 		print(f"{band_name} - shape: {arr.shape}, dtype: {arr.dtype}, min: {arr.min()}, max: {arr.max()}")
		# 		# Normalize for display if not all 0
		# 		arr_disp = arr
		# 		if arr.max() > arr.min():
		# 			arr_disp = (arr - arr.min()) / (arr.max() - arr.min())
		# 		plt.imshow(arr_disp, cmap='gray')
		# 		plt.title(band_name)
		# 		plt.axis('off')
		# 		plt.show()
		# except ImportError:
		# 	print("matplotlib, PIL, or numpy not installed. Install them to view TIFFs in Python.")




		# if not red_png or not nir_png:
		# 	print("Failed to convert images to PNG.")
		# 	return

		# Process images (NDVI or other)
		result = await process_satellite_images(nir_tiff, red_tiff)
		print("Processing complete. Result bytes length:", len(result) if result else 0)
		return result
	except Exception as e:
		print(f"Error in satellite_images_main: {e}")
		return None


def get_access_token(client_id, client_secret):
	token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
	payload = {
		"grant_type": "client_credentials",
		"client_id": client_id,
		"client_secret": client_secret
	}
	try:
		response = requests.post(token_url, data=payload)
		response.raise_for_status()
		return response.json()["access_token"]
	except requests.exceptions.RequestException as e:
		print(f"Error fetching token: {e}")
		return None

# Import farm_data from backend
def get_farm_bbox(lat, lon, margin=0.01):
	"""
	Returns bounding box [minLon, minLat, maxLon, maxLat] for user's farm, with a margin (degrees).
	"""
	try:
		print(f"Calculating farm bbox for lat: {lat}, lon: {lon} with margin: {margin}")  # Debug log
		return [lon - margin, lat - margin, lon + margin, lat + margin]
	except Exception as e:
		print(f"Error getting farm bbox: {e}")
		return None

async def get_satellite_images(lat, lon):
	"""
	Downloads Red (B04) and NIR (B08) bands as GeoTIFFs from Copernicus Sentinel Hub for user's farm bbox and current date.
	Returns: (red_bytes, nir_bytes) tuple, or (None, None) on failure.
	"""
	settings = get_settings()
	access_token = settings.COPERNICUS_CLIENT_SECRET and settings.COPERNICUS_CLIENT_ID and get_access_token(settings.COPERNICUS_CLIENT_ID, settings.COPERNICUS_CLIENT_SECRET)
	if not access_token:
		print("Failed to retrieve token. Exiting.")
		return None, None

	bbox = get_farm_bbox(lat, lon)

	if not bbox:
		print("No farm coordinates found for user.")
		return None, None
	
	#return await try_fix(access_token)

	# Use current date, fallback to last 30 days if needed
	today = datetime.utcnow()
	from_date = today - timedelta(days=100)
	from_str = from_date.strftime("%Y-%m-%dT00:00:00Z")
	to_str = today.strftime("%Y-%m-%dT23:59:59Z")

	process_api_url = "https://sh.dataspace.copernicus.eu/api/v1/process"
	evalscript_two_bands = """
	//VERSION=3
	function setup() {
		return {
			input: [{
				bands: ["B04", "B08"],
				units: "DN"
			}],
			output: [
				{ id: "red", bands: 1, sampleType: "UINT16" },
				{ id: "nir", bands: 1, sampleType: "UINT16" }
			]
		};
	}

	function evaluatePixel(samples) {
		return {
			red: [samples.B04],
			nir: [samples.B08]
		};
	}
	"""

	payload = {
		"input": {
			"bounds": {
				"bbox": bbox
			},
			"data": [
				{
					"type": "sentinel-2-l2a",
					"dataFilter": {
						"timeRange": {
							"from": from_str,
							"to": to_str
							# "from": "2024-07-01T00:00:00Z",
							# "to": "2024-07-31T23:59:59Z"
						},
						"maxCloudCoverage": 10,
						"mosaickingOrder": "leastCC"
					}
				}
			]
		},
		"output": {
			"width": 1024,
			"height": 1024,
			"responses": [
				{
					"identifier": "red",
					"format": {
						"type": "image/tiff"
					}
				},
				{
					"identifier": "nir",
					"format": {
						"type": "image/tiff"
					}
				}
			]
		},
		"evalscript": evalscript_two_bands
	}

	headers = {
		'Content-Type': 'application/json',
		'Accept': 'multipart/mixed',
		'Authorization':  f'Bearer {access_token}'
	}

	try:
		print("Sending Process API request to retrieve separate Red and NIR images...")
		response = requests.post(process_api_url, headers=headers, json=payload)
		response.raise_for_status()

		content_type = response.headers.get('Content-Type')
		if not content_type or 'multipart/mixed' not in content_type:
			raise ValueError("Response is not a multipart/mixed message.")

		decoder = MultipartDecoder.from_response(response)
		red_bytes = None
		nir_bytes = None
		for part in decoder.parts:
			content_disp = part.headers.get(b'Content-Disposition', b'').decode(errors='replace')
			if 'name="red"' in content_disp:
				red_bytes = part.content
			elif 'name="nir"' in content_disp:
				nir_bytes = part.content
			else:  ##lowk scuffed code, since the returned files do not have file names, only order
				if red_bytes is None:
					red_bytes = part.content
				else:
					nir_bytes = part.content
		if red_bytes and nir_bytes:
			print("Successfully downloaded Red and NIR bands.")
			return red_bytes, nir_bytes
		else:
			print("Bands not found in response.")
			# Print the full response content for debugging
			print("Full response content:")
			print(response.content)
			return None, None
	except requests.exceptions.HTTPError as errh:
		print(f"Http Error: {errh}")
		try:
			print(f"Response content: {response.json()}")
		except:
			print(f"Response content: {response.text}")
		return None, None
	except requests.exceptions.RequestException as err:
		print(f"Oops: Something Else Went Wrong: {err}")
		return None, None
	except ValueError as errv:
		print(f"Data Processing Error: {errv}")
		return None, None
			
    


# def try_fix(access_token):
# 	if not access_token:
# 			print("Failed to retrieve token. Exiting.")
# 			exit()
# 	process_api_url = "https://sh.dataspace.copernicus.eu/api/v1/process"

# 	#Red (B04) // NIR (B08)
# 	evalscript_two_bands = """
# 	//VERSION=3
# 	function setup() {
# 		return {
# 			input: [{
# 				bands: ["B04", "B08"], 
# 				units: "DN" 
# 			}],
# 			output: [
# 				{ id: "red", bands: 1, sampleType: "UINT16" }, // Output 1: Red band
# 				{ id: "nir", bands: 1, sampleType: "UINT16" }  // Output 2: NIR band
# 			]
# 		};
# 	}

# 	function evaluatePixel(samples) {
# 		// Return the Red band for the 'red' output and NIR band for the 'nir' output
# 		return {
# 				red: [samples.B04],
# 				nir: [samples.B08]
# 		};
# 	}
# 	"""

# 	payload = {
# 		"input": {
# 			"bounds": {
# 				"bbox": [0.5, 51.0, 0.51, 51.01] # Kent, UK (can change resolution by changing bounding box size) -> can pass in vals from farm selection?
# 			},
# 			"data": [
# 				{
# 					"type": "sentinel-2-l2a",
# 					"dataFilter": {
# 							"timeRange": {
# 									"from": "2024-07-01T00:00:00Z",
# 									"to": "2025-01-31T23:59:59Z"
# 							},
# 							"maxCloudCoverage": 10,
# 							"mosaickingOrder": "leastCC" 
# 					}
# 				}
# 			]
# 		},
# 		"output": {
# 			"width": 1024, 
# 			"height": 1024,
# 			"responses": [
# 				{
# 					"identifier": "red", # Corresponds to the 'red' output 
# 					"format": {
# 						"type": "image/tiff" 
# 					}
# 				},
# 				{
# 					"identifier": "nir", # Corresponds to the 'nir' outpur 
# 					"format": {
# 						"type": "image/tiff" 
# 					}
# 				}
# 			]
# 		},
# 		"evalscript": evalscript_two_bands
# 	}

# 	headers = {
# 			'Content-Type': 'application/json',
# 			# When requesting multiple files (responses), the service returns a multipart response.
# 			'Accept': 'multipart/mixed', 
# 			'Authorization':  f'Bearer {access_token}' 
# 	}
# 	# Make Request and Process Multipart Response
# 	try:
# 		print("Sending Process API request to retrieve separate Red and NIR images...")
# 		response = requests.post(process_api_url, headers=headers, json=payload)
# 		response.raise_for_status()

# 		# --- Multipart Response Parsing (using requests_toolbelt) ---
# 		content_type = response.headers.get('Content-Type')
# 		if not content_type or 'multipart/mixed' not in content_type:
# 			raise ValueError("Response is not a multipart/mixed message.")

# 		decoder = MultipartDecoder.from_response(response)
# 		saved_files = []
# 		for idx, part in enumerate(decoder.parts):
# 			print(f"\n--- Part {idx+1} ---")
# 			print("Headers:")
# 			for k, v in part.headers.items():
# 				field_name = k.decode(errors='replace')
# 				field_value = v.decode(errors='replace')
# 				print(f"  Field name: {field_name}")
# 				print(f"  Field value: {field_value}")
# 			print(f"Content type: {type(part.content)} | Content length: {len(part.content)} bytes")
# 			print(f"First 100 bytes of content: {part.content[:100]}")
# 			content_disp = part.headers.get(b'Content-Disposition', b'').decode(errors='replace')
# 			if 'name=\"red\"' in content_disp:
# 				filename = "red_band_b04.tiff"
# 			elif 'name=\"nir\"' in content_disp:
# 				filename = "nir_band_b08.tiff"
# 			else:
# 				print(f"(No matching identifier in Content-Disposition) -- saving as part{idx+1}.tiff - Content-Disposition: {content_disp}")
# 				filename = f"part{idx+1}.tiff"
# 			with open(filename, 'wb') as f:
# 				f.write(part.content)
# 			saved_files.append(filename)

# 		# Final success printout
# 		if saved_files:
# 			print("\nRequest successful!")
# 			print(f"Saved the following single-band GeoTIFF files for use in QGIS:")
# 			for f in saved_files:
# 				print(f"- {f}")
# 		else:
# 			print("\nRequest successful but no GeoTIFF files were saved. Check logs for errors.")
# 	except requests.exceptions.HTTPError as errh:
# 		print(f"Http Error: {errh}")
# 		try:
# 			# If the error is JSON formatted, print the details
# 			print(f"Response content: {response.json()}")
# 		except:
# 			# Otherwise, print raw text
# 			print(f"Response content: {response.text}")
# 	except requests.exceptions.RequestException as err:
# 		print(f"Oops: Something Else Went Wrong: {err}")
# 	except ValueError as errv:
# 		print(f"Data Processing Error: {errv}")