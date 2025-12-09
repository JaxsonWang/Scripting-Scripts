/**
 * 简单的 sleep 实现
 * @param ms 等待时间（毫秒）
 */
export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms))
