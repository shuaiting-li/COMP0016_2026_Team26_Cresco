//imports
import React, { useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import area from '@turf/area';
import { polygon } from '@turf/helpers';
import { saveFarmData, geocodeSearch, geocodeReverse } from './services/api';


//reimported images cos it was breaking 
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const createDotIcon = (isGhost = false) => {
  return L.divIcon({
    className: "custom-point-icon", // Keeps Leaflet from adding default styles

    //if ghost marker, can set cusrom colour !
    html: `
      <div style="
        background-color: ${isGhost ? '#b1040429' : '#d50000ff'};  
        width: 10px; 
        height: 10px; 
        border-radius: 50%; 
        border: 2px solid white; 
        box-shadow: 0 0 4px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [14, 14],   // The size of the div
    iconAnchor: [9, 9],   // Point of the icon which will correspond to marker's location (center it)
  });
};

const createCenterIcon = () => {
  return L.divIcon({
    className: "custom-center-icon",
    html: `
      <div style="
        background-color: #004488;  
        width: 12px; 
        height: 12px; 
        border-radius: 50%; 
        border: 2px solid white; 
        box-shadow: 0 0 4px rgba(0,0,0,0.6);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [10, 10],
  });
};

const realDotIcon = createDotIcon(false);  // Solid Red
const ghostDotIcon = createDotIcon(true);  // Semi-transparent Red
const centerDotIcon = createCenterIcon();  // Solid Blue


//main function
const SatelliteMap = ({ farmLocation, setFarmLocation }) => {
  //list of markers
  const [positions, setPositions] = useState([
    [40.785091, -73.968285],
    [40.790091, -73.968285],
    [40.790091, -73.960285],
    [40.785091, -73.960285],
  ]);

  const [mapCenter, setMapCenter] = useState(null);  //map center variable
  const [searchQuery, setSearchQuery] = useState(""); // for search queries

  //function that calculates the area
  const calculateGeoArea = () => {
    try {
      // converst Leaflet [Lat, Lng] to GeoJSON [Lng, Lat] -> changes the leaflet to orl (y x) -> (x y)
      const turfPoints = positions.map(p => [p[1], p[0]]);

      // the polygon needs to be closed for area calcs, so this adds the first point back on, to create an array of 5 points, where the last is the same as the first and the loop is closed.
      // should be able to add more points as necessary
      turfPoints.push(turfPoints[0]);

      // creates Turf Object and calculates area
      const poly = polygon([turfPoints]);
      const areaSqMeters = area(poly);

      // Convert to sq km and format and return
      return {
        sqMeters: areaSqMeters.toFixed(0),
        sqKm: (areaSqMeters / 1_000_000).toFixed(3)
      };
    } catch {
      return { sqMeters: 0, sqKm: 0 };
    }
  };

  const areaData = calculateGeoArea();

  const polygonCenter = useMemo(() => {
    if (positions.length === 0) return null;

    let sumLat = 0;
    let sumLng = 0;

    positions.forEach(pos => {
      sumLat += pos[0];
      sumLng += pos[1];
    });

    return [sumLat / positions.length, sumLng / positions.length];
  }, [positions]);


  //this is the ghost markers that can be clicked to give real markers
  const midpoints = useMemo(() => {
    if (positions.length < 3) return []; // Not a polygon yet

    return positions.map((pos, index) => {
      // loops through list to find where ghost markers should be
      const nextIndex = (index + 1) % positions.length;
      const nextPos = positions[nextIndex];

      // average the points to find the middle between adjacent poitns
      const midLat = (pos[0] + nextPos[0]) / 2;
      const midLng = (pos[1] + nextPos[1]) / 2;

      return {
        lat: midLat,
        lng: midLng,
        insertIndex: nextIndex, // Where to insert if this ghost is used
      };
    });
  }, [positions]);



  // updates marker positions when dragged, per marker
  const updatePosition = (index, newLatLng) => {
    const newPositions = [...positions];
    newPositions[index] = [newLatLng.lat, newLatLng.lng];
    setPositions(newPositions);
  };

  const handleCenterDrag = (newLatLng) => {
    if (!polygonCenter) return;

    const latDiff = newLatLng.lat - polygonCenter[0];
    const lngDiff = newLatLng.lng - polygonCenter[1];

    const newPositions = positions.map(pos => [
      pos[0] + latDiff,
      pos[1] + lngDiff
    ]);

    setPositions(newPositions);
  };


  //turns ghost marker into real marker
  const insertNewPoint = (insertIndex, newLatLng) => {
    const newPositions = [...positions];
    // Splice: Go to 'insertIndex', remove 0 items, add [lat, lng]
    newPositions.splice(insertIndex, 0, [newLatLng.lat, newLatLng.lng]);
    setPositions(newPositions);
  };

  // remove point (Double click), until 3 points remaining
  const removePoint = (index) => {
    if (positions.length <= 3) return;
    setPositions(positions.filter((_, i) => i !== index));
  };



  const resetPolygon = (lat, lng) => {
    const offset = 0.0025;

    const newPositions = [
      [lat + offset, lng - offset],
      [lat + offset, lng + offset],
      [lat - offset, lng + offset],
      [lat - offset, lng - offset],
    ];

    setPositions(newPositions);
    setMapCenter([lat, lng]);

    // Save the farm location
    setFarmLocation({ lat, lng });
  };


  const handleLocateMe = () => {
    // check if the browser actually supports this feature
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        resetPolygon(lat, lng);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please ensure location services are enabled.");
      }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery) return;

    try {
      const data = await geocodeSearch(searchQuery);

      if (data && data.length > 0) {  //actually returns a list of results, so choose firt results (most accurate) - can have a dropdown menu asw?
        const firstResult = data[0];

        //convert string result to floats here
        const lat = parseFloat(firstResult.lat);
        const lng = parseFloat(firstResult.lon);

        resetPolygon(lat, lng);
      } else {
        alert("Location not found. Try a different search term.");
      }

    } catch (error) {
      console.error("Search error:", error);
      alert("An error occurred while searching.");
    }
  };

  const handleSelectAsFarm = async () => {
    if (positions.length > 0) {
      try {
        const centerLat = positions.reduce((sum, pos) => sum + pos[0], 0) / positions.length;
        const centerLng = positions.reduce((sum, pos) => sum + pos[1], 0) / positions.length;

        // Fetch the location name using reverse geocoding via backend proxy
        let locationName = `${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`;
        try {
          const reverseGeocodeData = await geocodeReverse(centerLat, centerLng);
          locationName = reverseGeocodeData.display_name || locationName;
        } catch (geoErr) {
          console.warn("Reverse geocoding failed, using coordinates:", geoErr);
        }

        const farmData = {
          location: locationName,
          area: areaData.sqKm
        };

        console.log("Farm data to send:", farmData);

        setFarmLocation({ lat: centerLat, lng: centerLng });
        setMapCenter([centerLat, centerLng]);

        const result = await saveFarmData(farmData);
        console.log("Farm data saved successfully:", result);
        alert(`Farm location saved: ${locationName}, Area: ${areaData.sqKm} km²`);
      } catch (error) {
        console.error("Error in handleSelectAsFarm:", error);
        alert("An error occurred while saving farm data. Please check the console for details.");
      }
    } else {
      alert("No polygon defined to select as farm.");
    }
  };

  return (

    //the actual returned webstire
    <div style={{
      padding: '20px',
      fontFamily: 'sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Control Panel */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleLocateMe}
          style={{ padding: '8px 12px', cursor: 'pointer' }}
        >
          📍 Use My Location
        </button>

        {/*search Input*/}
        <input
          type="text"
          placeholder="City, Address, or Postcode"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            padding: '8px',
            flexGrow: 1,
            minWidth: '200px',
            color: '#000',
            backgroundColor: '#fff'
          }}
        />

        <button
          onClick={handleSearch}
          style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#004488', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Search
        </button>

        <button
          onClick={handleSelectAsFarm}
          style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Select as Farm
        </button>
      </div>

      {/* Display Farm Location */}
      {farmLocation && (
        <div style={{ marginTop: '10px', color: '#004488' }}>
          <strong>Farm Location:</strong> {farmLocation.lat.toFixed(6)}, {farmLocation.lng.toFixed(6)}
        </div>
      )}

      <div style={{ height: '500px', width: '100%', border: '2px solid #333' }}>
        <MapContainer
          center={[40.787, -73.964]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
        >
          <FlyToLocation center={mapCenter} />

          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          <Polygon positions={positions} pathOptions={{ color: 'yellow', fillColor: 'yellow', fillOpacity: 0.4 }} />

          {positions.map((pos, index) => (
            <DraggableMarker
              key={index}
              position={pos}
              index={index}
              onDrag={updatePosition}
              onRemove={removePoint}
            />
          ))}

          {midpoints.map((mid, i) => (
            <GhostMarker
              key={`ghost-${i}`}
              position={[mid.lat, mid.lng]}
              insertIndex={mid.insertIndex}
              onDrop={insertNewPoint}
            />
          ))}

          {polygonCenter && (
            <CenterMarker
              position={polygonCenter}
              onDrag={handleCenterDrag}
              onDragEnd={(newLatLng) => setMapCenter([newLatLng.lat, newLatLng.lng])}
            />
          )}
        </MapContainer>
      </div>

      <div style={{ marginTop: '15px', padding: '15px', background: '#f4f4f4', borderRadius: '5px', color: '#004488' }}>
        <strong>Calculated Area:</strong> <br />
        {areaData.sqMeters} m² <br />
        {areaData.sqKm} km²
      </div>
    </div>
  );
};

export default SatelliteMap;

// helper component for real marker
function DraggableMarker({ position, index, onDrag, onRemove }) {
  const markerRef = useRef(null);
  const eventHandlers = useMemo(
    () => ({
      drag() {
        if (markerRef.current) onDrag(index, markerRef.current.getLatLng());
      },
      dblclick(e) {
        L.DomEvent.stopPropagation(e);
        onRemove(index);
      }
    }),
    [index, onDrag, onRemove]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={realDotIcon}
    />
  );
}
// funct that moves the map when center coordinates change  //moved out of main map component so its not redrawn when map is changed
function FlyToLocation({ center }) {
  const map = useMap();

  // Whenever 'center' changes, fly to the new spot
  React.useEffect(() => {
    if (center) {
      map.flyTo(center, 15); // Zoom level 16
    }
  }, [center, map]);

  return null;
}

function CenterMarker({ position, onDrag, onDragEnd }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      drag() {
        if (markerRef.current) {
          onDrag(markerRef.current.getLatLng());
        }
      },
      dragend() {
        if (markerRef.current) {
          onDragEnd(markerRef.current.getLatLng());
        }
      }
    }),
    [onDrag, onDragEnd]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={centerDotIcon}
      zIndexOffset={100}
    />
  );
}

// helper component for ghost markers
function GhostMarker({ position, insertIndex, onDrop }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      // triggers updates when drag ends
      dragend() {
        if (markerRef.current) {
          onDrop(insertIndex, markerRef.current.getLatLng());
        }
      },
    }),
    [insertIndex, onDrop]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={ghostDotIcon}
      zIndexOffset={-100}
    />
  );
}