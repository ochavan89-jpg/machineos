importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDluvtguRxpoEHBcKZlieOj57pdnikTw2k",
  authDomain: "machineos-de.firebaseapp.com",
  projectId: "machineos-de",
  storageBucket: "machineos-de.firebasestorage.app",
  messagingSenderId: "444073930385",
  appId: "1:444073930385:web:2bb8fed823f0feafd59930"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background Message:', payload);
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
  });
});