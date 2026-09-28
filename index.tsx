import './gesture-handler';

import '@expo/metro-runtime'; // Necessary for Fast Refresh on Web
import { registerRootComponent } from 'expo';

import { App } from './src/app/App';

// Registers App as 'main' and sets up the environment for Expo Go and native builds.
registerRootComponent(App);
