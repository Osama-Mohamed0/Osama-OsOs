// يجمع إضافات Capacitor في كائن واحد تستخدمه الواجهة (تُحزَّم بـ esbuild إلى www/js/mobile/native.js)
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

window.Native = { isNative: Capacitor.isNativePlatform(), App, LocalNotifications, Filesystem, Directory, Encoding, Share };
