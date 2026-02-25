/**
 * Tests for the SidebarLeft component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidebarLeft from '../layout/SidebarLeft';

describe('SidebarLeft', () => {
    /** Tests for the left sidebar (data sources panel). */

    let onUpload;
    let onRemove;

    beforeEach(() => {
        onUpload = vi.fn();
        onRemove = vi.fn();
    });

    it('renders the Data Sources heading', () => {
        /** Verifies the sidebar title is displayed. */
        render(<SidebarLeft files={[]} onUpload={onUpload} onRemove={onRemove} />);
        expect(screen.getByText('Data Sources')).toBeInTheDocument();
    });

    it('renders the Add Field Data button', () => {
        /** Verifies the upload button is present. */
        render(<SidebarLeft files={[]} onUpload={onUpload} onRemove={onRemove} />);
        expect(screen.getByText('Add Field Data')).toBeInTheDocument();
    });

    it('shows zero sources active when no files', () => {
        /** Verifies the file count footer with zero files. */
        render(<SidebarLeft files={[]} onUpload={onUpload} onRemove={onRemove} />);
        expect(screen.getByText('0 sources active')).toBeInTheDocument();
    });

    it('displays uploaded files', () => {
        /** Verifies file names are rendered in the list. */
        const files = [
            { name: 'soil_report.md' },
            { name: 'weather_data.pdf' },
        ];
        render(<SidebarLeft files={files} onUpload={onUpload} onRemove={onRemove} />);

        expect(screen.getByText('soil_report.md')).toBeInTheDocument();
        expect(screen.getByText('weather_data.pdf')).toBeInTheDocument();
        expect(screen.getByText('2 sources active')).toBeInTheDocument();
    });

    it('calls onRemove when delete button is clicked', async () => {
        /** Verifies the remove callback fires with the correct index. */
        const files = [{ name: 'file1.md' }, { name: 'file2.md' }];
        render(<SidebarLeft files={files} onUpload={onUpload} onRemove={onRemove} />);
        const user = userEvent.setup();

        // Find the delete button within the file item containing 'file1.md'
        const fileItem = screen.getByText('file1.md').closest('div');
        const deleteBtn = fileItem.querySelector('button');

        await user.click(deleteBtn);
        expect(onRemove).toHaveBeenCalledWith(0);
    });

    it('hidden file input accepts .md and .pdf files', () => {
        /** Verifies the file input has the correct accept attribute. */
        render(<SidebarLeft files={[]} onUpload={onUpload} onRemove={onRemove} />);

        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();
        expect(fileInput).toHaveAttribute('accept', '.md,.pdf');
        expect(fileInput).toHaveAttribute('multiple');
    });
});
