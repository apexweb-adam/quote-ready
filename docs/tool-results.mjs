export function flushToolResults(pending, lastTurn, send) {
  if (lastTurn !== 'reply.done') return 0;
  let sent = 0;
  while (pending.length) {
    const item = pending[0];
    send({ type: 'tool.result', call_id: item.id, result: JSON.stringify(item.result) });
    pending.shift(); sent++;
  }
  return sent;
}
