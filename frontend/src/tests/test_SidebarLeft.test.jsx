/**
 * Tests for the SidebarLeft component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

    it('hidden file input accepts supported text formats', () => {
        /** Verifies the file input has the correct accept attribute. */
        render(<SidebarLeft files={[]} onUpload={onUpload} onRemove={onRemove} />);

        const fileInput = document.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();
        expect(fileInput).toHaveAttribute('accept', '.md,.pdf,.txt,.csv,.json');
        expect(fileInput).toHaveAttribute('multiple');
    });

    it('handles drag over state', () => {
        /** Verifies the component adds a dragging class when a file is dragged over. */
        const { getByTestId } = render(<SidebarLeft files={[]} onUpload={onUpload} onRemove={onRemove} />);
        const sidebar = getByTestId('sidebar-left');

        // Initial state should not have dragging class
        expect(sidebar.className).not.toMatch(/sidebarDragging/);

        // Trigger dragover
        act(() => {
            fireEvent.dragOver(sidebar, {
                dataTransfer: { types: ['Files'] }
            });
        });

        // State update means we check classes after render (testing css modules class substring)
        expect(sidebar.className).toMatch(/sidebarDragging/);

        // Trigger dragleave
        act(() => {
            fireEvent.dragLeave(sidebar);
        });

        expect(sidebar.className).not.toMatch(/sidebarDragging/);
    });

    it('filters invalid file types on drop', () => {
        /** Verifies dropping files ignores unsupported types. */
        const { getByTestId } = render(<SidebarLeft files={[]} onUpload={onUpload} onRemove={onRemove} />);
        const sidebar = getByTestId('sidebar-left');

        // Trigger dragover first to test the full lifecycle
        act(() => {
            fireEvent.dragOver(sidebar, {
                dataTransfer: { types: ['Files'] }
            });
        });

        // Then drop
        act(() => {
            fireEvent.drop(sidebar, {
                dataTransfer: {
                    files: [
                        new File(['content'], 'valid.md', { type: 'text/markdown' }),
                        new File(['content'], 'valid.pdf', { type: 'application/pdf' }),
                        new File(['{"a":1}'], 'data.json', { type: 'application/json' }),
                        new File(['col1,col2'], 'report.csv', { type: 'text/csv' }),
                        new File(['hello'], 'notes.txt', { type: 'text/plain' }),
                        new File(['content'], 'invalid.png', { type: 'image/png' })
                    ]
                }
            });
        });

        expect(sidebar.className).not.toMatch(/sidebarDragging/);
        expect(onUpload).toHaveBeenCalledTimes(1);
        
        const uploadedFiles = onUpload.mock.calls[0][0];
        expect(uploadedFiles).toHaveLength(5);
        expect(uploadedFiles[0].name).toBe('valid.md');
        expect(uploadedFiles[1].name).toBe('valid.pdf');
        expect(uploadedFiles[2].name).toBe('data.json');
        expect(uploadedFiles[3].name).toBe('report.csv');
        expect(uploadedFiles[4].name).toBe('notes.txt');
    });
});
