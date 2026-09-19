# College Transport Management System

A simple College Transport Management System using HTML, CSS, JavaScript, Node.js/Express for serving the website, and Firebase Realtime Database for application data.

## Main Features
- Login using name and phone number
- Add bus
- View buses
- Change bus name
- Start and stop journey
- Live GPS location updates
- Live bus map
- Delete bus
- Dashboard bus statistics
- Responsive desktop/mobile layout

## Architecture
Browser → Firebase Realtime Database

Node.js/Express is used only to serve the frontend locally and on Render. MySQL is not required.

## Run locally
1. Open the project folder in VS Code.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:5000`.

## Firebase
`firebase-config.js` contains the Firebase project configuration. Realtime Database data is stored under `users` and `buses`.

## Important
Set appropriate Firebase Realtime Database Security Rules in the Firebase Console before using the project publicly. The current name + phone login is a simple project login flow and should not be treated as production-grade identity verification.
