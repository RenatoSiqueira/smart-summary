const originalConsole = global.console;

global.console = {
  ...originalConsole,
  log: jest.fn(() => {}),
  debug: jest.fn(() => {}),
  info: jest.fn(() => {}),
  warn: jest.fn(() => {}),
  error: jest.fn(() => {}),
};
