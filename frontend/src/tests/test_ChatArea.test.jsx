/**
 * Tests for the ChatArea component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatArea from '../layout/ChatArea';

describe('ChatArea', () => {
    /** Tests for the main chat interface. */

    let onSendMessage;

    beforeEach(() => {
        onSendMessage = vi.fn();
    });

    it('renders empty state with Cresco Intelligence heading', () => {
        /** Verifies the hero/empty state is shown with no messages. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} />);
        expect(screen.getByText('Cresco Intelligence')).toBeInTheDocument();
    });

    it('renders the message input', () => {
        /** Verifies the input placeholder is present. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} />);
        expect(screen.getByPlaceholderText(/message cresco/i)).toBeInTheDocument();
    });

    it('sends message on button click', async () => {
        /** Verifies send callback fires with input text. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, 'What diseases affect wheat?');
        // The send button only contains an ArrowUp SVG icon (no accessible name)
        await user.click(screen.getByRole('button', { name: '' }));

        expect(onSendMessage).toHaveBeenCalledWith('What diseases affect wheat?');
    });

    it('sends message on Enter key', async () => {
        /** Verifies Enter key triggers send. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, 'Hello{Enter}');

        expect(onSendMessage).toHaveBeenCalledWith('Hello');
    });

    it('clears input after sending', async () => {
        /** Verifies the input is emptied after a message is sent. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, 'test{Enter}');

        expect(input).toHaveValue('');
    });

    it('does not send empty messages', async () => {
        /** Verifies whitespace-only messages are blocked. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, '   {Enter}');

        expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('renders user messages', () => {
        /** Verifies user messages appear in the chat. */
        const messages = [{ id: 1, role: 'user', content: 'Hello Cresco' }];
        render(<ChatArea messages={messages} onSendMessage={onSendMessage} isLoading={false} />);

        expect(screen.getByText('Hello Cresco')).toBeInTheDocument();
    });

    it('renders assistant messages with markdown', () => {
        /** Verifies assistant messages are rendered. */
        const messages = [{ id: 2, role: 'assistant', content: 'Wheat is a **cereal crop**.' }];
        render(<ChatArea messages={messages} onSendMessage={onSendMessage} isLoading={false} />);

        expect(screen.getByText(/cereal crop/i)).toBeInTheDocument();
    });

    it('renders tasks when present', () => {
        /** Verifies task suggestions are displayed. */
        const messages = [{
            id: 2,
            role: 'assistant',
            content: 'Here is your plan.',
            tasks: [{ title: 'Sow Seeds', detail: 'Plant in October', priority: 'high' }],
        }];
        render(<ChatArea messages={messages} onSendMessage={onSendMessage} isLoading={false} />);

        expect(screen.getByText('Sow Seeds')).toBeInTheDocument();
        expect(screen.getByText('Plant in October')).toBeInTheDocument();
        expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('renders citations when present', () => {
        /** Verifies source citations are displayed. */
        const messages = [{
            id: 2,
            role: 'assistant',
            content: 'Based on the guide.',
            citations: ['wheat_guide.md', 'crop_management.md'],
        }];
        render(<ChatArea messages={messages} onSendMessage={onSendMessage} isLoading={false} />);

        expect(screen.getByText('wheat_guide.md')).toBeInTheDocument();
        expect(screen.getByText('crop_management.md')).toBeInTheDocument();
    });

    it('shows loading indicator when isLoading is true', () => {
        /** Verifies the "Processing..." text appears during loading. */
        const messages = [{ id: 1, role: 'user', content: 'hi' }];
        render(<ChatArea messages={messages} onSendMessage={onSendMessage} isLoading={true} />);

        expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    it('does not show loading when isLoading is false', () => {
        /** Verifies no loading indicator when not loading. */
        const messages = [{ id: 1, role: 'user', content: 'hi' }];
        render(<ChatArea messages={messages} onSendMessage={onSendMessage} isLoading={false} />);

        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
    });

    it('skips event role messages', () => {
        /** Verifies messages with role=event are not rendered. */
        const messages = [
            { id: 1, role: 'event', content: 'System event' },
            { id: 2, role: 'user', content: 'Hello' },
        ];
        render(<ChatArea messages={messages} onSendMessage={onSendMessage} isLoading={false} />);

        expect(screen.queryByText('System event')).not.toBeInTheDocument();
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });
});
