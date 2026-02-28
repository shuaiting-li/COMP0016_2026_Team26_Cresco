/**
 * Tests for the ChatArea component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatArea from '../layout/ChatArea';

describe('ChatArea', () => {
    /** Tests for the main chat interface. */

    let onSendMessage;
    let onDeleteLastExchange;

    beforeEach(() => {
        onSendMessage = vi.fn();
        onDeleteLastExchange = vi.fn();
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

    it('disables input and send button while loading', () => {
        /** Verifies the input is disabled and shows a loading placeholder during processing. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={true} />);

        expect(screen.getByPlaceholderText(/waiting for response/i)).toBeDisabled();
        expect(screen.getByRole('button', { name: '' })).toBeDisabled();
    });

    it('does not send on Enter while loading', () => {
        /** Verifies the isLoading guard in handleSend blocks dispatch even with text typed. */
        const { rerender } = render(
            <ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} />,
        );

        // Type text so input state is non-empty, then switch to loading
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'test message' } });

        rerender(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={true} />);

        // Fire keyDown directly — jsdom bypasses native disabled filtering,
        // so the React onKeyDown handler is reached and the isLoading guard is exercised.
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

        expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('shows delete button on last user message after response', async () => {
        /** Verifies the delete button appears beside the last user message once the assistant responds. */
        const messages = [
            { id: 1, role: 'user', content: 'hello' },
            { id: 2, role: 'assistant', content: 'hi there' },
        ];
        render(
            <ChatArea messages={messages} onSendMessage={onSendMessage}
                onDeleteLastExchange={onDeleteLastExchange} isLoading={false} />,
        );

        expect(screen.getByRole('button', { name: /delete last exchange/i })).toBeInTheDocument();
    });

    it('does not show delete button while loading', () => {
        /** Verifies the delete button is hidden while the bot is still processing. */
        const messages = [
            { id: 1, role: 'user', content: 'hello' },
            { id: 2, role: 'assistant', content: 'hi there' },
        ];
        render(
            <ChatArea messages={messages} onSendMessage={onSendMessage}
                onDeleteLastExchange={onDeleteLastExchange} isLoading={true} />,
        );

        expect(screen.queryByRole('button', { name: /delete last exchange/i })).not.toBeInTheDocument();
    });

    it('does not show delete button when last message is user only', () => {
        /** Verifies the delete button does not appear before the assistant responds. */
        const messages = [
            { id: 1, role: 'user', content: 'hello' },
        ];
        render(
            <ChatArea messages={messages} onSendMessage={onSendMessage}
                onDeleteLastExchange={onDeleteLastExchange} isLoading={false} />,
        );

        expect(screen.queryByRole('button', { name: /delete last exchange/i })).not.toBeInTheDocument();
    });

    it('calls onDeleteLastExchange when delete button is clicked', async () => {
        /** Verifies the delete callback fires when the delete button is clicked. */
        const messages = [
            { id: 1, role: 'user', content: 'hello' },
            { id: 2, role: 'assistant', content: 'hi there' },
        ];
        render(
            <ChatArea messages={messages} onSendMessage={onSendMessage}
                onDeleteLastExchange={onDeleteLastExchange} isLoading={false} />,
        );
        const user = userEvent.setup();

        await user.click(screen.getByRole('button', { name: /delete last exchange/i }));

        expect(onDeleteLastExchange).toHaveBeenCalledTimes(1);
    });
});
