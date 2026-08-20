export async function sendRpc<T = any>(type: string, data?: any): Promise<T> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw new Error('Chrome Extension API недоступно');
  }

  const response = await chrome.runtime.sendMessage({ type, data });
  if (!response?.success) {
    throw new Error(response?.error || 'Неизвестная ошибка RPC');
  }
  return response.data;
}
