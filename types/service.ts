// types/service.ts

export interface IService {
  init(): Promise<void> | void;
  stop(): Promise<void> | void;
}

export interface IWebSocketService extends IService {
  handleCommand(command: any): Promise<void> | void;
}
