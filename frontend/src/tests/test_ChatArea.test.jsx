/**
 * Tests for the ChatArea component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import ChatArea from '../layout/ChatArea';

function ControlledChatArea(props) {
    const [internetSearchEnabled, setInternetSearchEnabled] = useState(true);

    return (
        <ChatArea
            {...props}
            internetSearchEnabled={internetSearchEnabled}
            setInternetSearchEnabled={setInternetSearchEnabled}
        />
    );
}

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
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} internetSearchEnabled={true} setInternetSearchEnabled={vi.fn()} />);
        expect(screen.getByText('Cresco Intelligence')).toBeInTheDocument();
    });

    it('renders the message input', () => {
        /** Verifies the input placeholder is present. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} internetSearchEnabled={true} setInternetSearchEnabled={vi.fn()} />);
        expect(screen.getByPlaceholderText(/message cresco/i)).toBeInTheDocument();
    });

    it('sends message on button click', async () => {
        /** Verifies send callback fires with input text. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} internetSearchEnabled={true} setInternetSearchEnabled={vi.fn()} />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, 'What diseases affect wheat?');
        await user.click(screen.getByRole('button', { name: /send message/i }));

        expect(onSendMessage).toHaveBeenCalledWith('What diseases affect wheat?', true);
    });

    it('sends message on Enter key', async () => {
        /** Verifies Enter key triggers send. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} internetSearchEnabled={true} setInternetSearchEnabled={vi.fn()} />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, 'Hello{Enter}');

        expect(onSendMessage).toHaveBeenCalledWith('Hello', true);
    });

    it('clears input after sending', async () => {
        /** Verifies the input is emptied after a message is sent. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} internetSearchEnabled={true} setInternetSearchEnabled={vi.fn()} />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, 'test{Enter}');

        expect(input).toHaveValue('');
    });

    it('does not send empty messages', async () => {
        /** Verifies whitespace-only messages are blocked. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} internetSearchEnabled={true} setInternetSearchEnabled={vi.fn()} />);
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

        expect(screen.getByPlaceholderText(/waiting for cresco/i)).toBeDisabled();
        expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
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

    it('inserts newline on Shift+Enter without sending', async () => {
        /** Verifies Shift+Enter adds a newline to the input rather than sending. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} internetSearchEnabled={true} setInternetSearchEnabled={vi.fn()} />);
        const user = userEvent.setup();

        const input = screen.getByRole('textbox');
        await user.type(input, 'line one');
        await user.keyboard('{Shift>}{Enter}{/Shift}');
        await user.type(input, 'line two');

        expect(onSendMessage).not.toHaveBeenCalled();
        expect(input).toHaveValue('line one\nline two');
    });

    it('preserves newlines in user messages', () => {
        /** Verifies user message text renders with newlines intact (not through markdown). */
        const messages = [{ id: 1, role: 'user', content: 'line one\nline two' }];
        render(<ChatArea messages={messages} onSendMessage={onSendMessage} isLoading={false} />);

        const el = screen.getByText(/line one/);
        expect(el.textContent).toBe('line one\nline two');
    });

    it('renders internet search toggle button', () => {
        /** Verifies the internet search toggle is rendered. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} internetSearchEnabled={true} setInternetSearchEnabled={vi.fn()} />);
        expect(screen.getByRole('button', { name: /toggle internet search/i })).toBeInTheDocument();
    });

    it('internet search is enabled by default', () => {
        /** Verifies the toggle starts in the enabled state. */
        render(<ChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} internetSearchEnabled={true} setInternetSearchEnabled={vi.fn()} />);
        const toggle = screen.getByRole('button', { name: /toggle internet search/i });
        expect(toggle.title).toBe('Internet search enabled');
    });

    it('toggles internet search off when clicked', async () => {
        /** Verifies clicking the toggle disables internet search. */
        render(<ControlledChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} />);
        const user = userEvent.setup();

        const toggle = screen.getByRole('button', { name: /toggle internet search/i });
        await user.click(toggle);

        expect(toggle.title).toBe('Internet search disabled');
    });

    it('sends message with internet search disabled after toggle', async () => {
        /** Verifies the send callback includes the internet search state. */
        render(<ControlledChatArea messages={[]} onSendMessage={onSendMessage} isLoading={false} />);
        const user = userEvent.setup();

        // Disable internet search
        await user.click(screen.getByRole('button', { name: /toggle internet search/i }));

        // Send a message
        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, 'Hello{Enter}');

        expect(onSendMessage).toHaveBeenCalledWith('Hello', false);
    it('switches to dashboard tab', async () => {
        /** Verifies clicking the Dashboard tab shows the dashboard view. */
        const user = userEvent.setup();
        // Stub the NDVI fetch that Dashboard triggers
        fetch.mockResolvedValue({ ok: true, json: async () => ({ images: [] }) });

        render(
            <ChatArea messages={[]} onSendMessage={onSendMessage}
                onDeleteLastExchange={onDeleteLastExchange} isLoading={false}
                farmLocation={null} />,
        );

        await user.click(screen.getByText('Dashboard'));
        expect(screen.getByText('Farm Overview')).toBeInTheDocument();
    });

    it('renders charts when present in assistant message', () => {
        /** Verifies inline chart rendering for messages with chart data. */
        const messages = [{
            id: 2,
            role: 'assistant',
            content: 'Here are the yields.',
            charts: [{
                type: 'bar',
                data: [{ name: 'Wheat', value: 50 }],
                xKey: 'name',
                yKey: 'value',
                title: 'Yield Chart',
                position: 0,
            }],
        }];
        render(<ChatArea messages={messages} onSendMessage={onSendMessage} isLoading={false} />);
        // Chart title appears in both inline rendering and the charts list
        const titles = screen.getAllByText('Yield Chart');
        expect(titles.length).toBeGreaterThanOrEqual(1);
    });
});
