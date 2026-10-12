import { ipcMain } from 'electron';
import * as log from 'electron-log/main';
import * as Store from 'electron-store';
import { autoUpdater } from 'electron-updater';

const persistentStore = new Store({
   name: 'settings',
   clearInvalidConfig: true,
   migrations: {
      '0.7.15': store => {
         store.set('allow_prerelease', false);
      }
   }
});

let mainWindow: Electron.IpcMainEvent;
let isUpdateAvailable = false;
autoUpdater.allowPrerelease = persistentStore.get('allow_prerelease', false) as boolean;

export default () => {
   ipcMain.on('check-for-updates', event => {
      mainWindow = event;
      if (process.windowsStore || (process.platform === 'linux' && !process.env.APPIMAGE))
         mainWindow.reply('no-auto-update');
      else {
         autoUpdater.checkForUpdatesAndNotify().catch(() => {
            mainWindow.reply('check-failed');
         });
      }
   });

   ipcMain.on('restart-to-update', () => {
      autoUpdater.quitAndInstall();
   });

   // auto-updater events
   autoUpdater.on('checking-for-update', () => {
      isUpdateAvailable = false;
      mainWindow.reply('checking-for-update');
   });

   autoUpdater.on('update-available', () => {
      isUpdateAvailable = true;
      mainWindow.reply('update-available');
   });

   autoUpdater.on('update-not-available', () => {
      mainWindow.reply('update-not-available');
   });

   autoUpdater.on('download-progress', event => {
      mainWindow.reply('download-progress', event);
   });

   autoUpdater.on('update-downloaded', () => {
      mainWindow.reply('update-downloaded');
   });

   // A failed check is handled by the check-for-updates catch. When the download or install fails
   // (e.g. macOS refuses an update for an unsigned build), link to the download page instead
   autoUpdater.on('error', () => {
      if (isUpdateAvailable)
         mainWindow.reply('link-to-download');
   });

   log.transports.file.level = 'info';
   // log.transports.console.format = '{h}:{i}:{s} {text}';
   autoUpdater.logger = log;
};
