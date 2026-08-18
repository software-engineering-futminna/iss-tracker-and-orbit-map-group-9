# ISS Tracker & Orbit Map

## Project Overview

ISS Tracker & Orbit Map is a web-based application that allows users to monitor the real-time position of the International Space Station (ISS) on an interactive world map.

The application also allows users to provide a geographical location using latitude and longitude coordinates and request an ISS pass-over prediction.

The project was developed as a group Software Engineering project.

---

## Aim

To develop a simple and responsive web application that enables users to track the International Space Station in real time and obtain pass-over predictions for a selected geographical location.

---

## Objectives

- To display the current position of the ISS on an interactive world map.
- To automatically update the ISS position at regular intervals.
- To display the current latitude and longitude of the ISS.
- To allow users to enter geographical coordinates.
- To provide ISS pass-over predictions for the selected coordinates.
- To provide a responsive interface for desktop and mobile devices.
- To provide light and dark display modes.
- To handle API and input errors appropriately.

---

## Main Features

### Real-Time ISS Tracking
The application retrieves the current ISS position and displays it on an interactive world map.

### Automatic Position Updates
The ISS position is automatically refreshed at regular intervals so that the tracker remains current.

### Interactive World Map
Users can view the ISS location on a world map and interact with the map.

### Current Position Information
The application displays:

- Latitude
- Longitude
- ISS status
- Last updated information

### Pass-Over Prediction
Users can enter latitude and longitude coordinates to request an ISS pass-over prediction.

### Coordinate Validation
The application validates the latitude and longitude entered by the user before requesting a prediction.

### Dark Mode
Users can switch between light and dark display modes.

### Responsive Design
The interface adapts to desktop, tablet, and mobile screen sizes.

### Error Handling
The application provides appropriate feedback when an API request fails or invalid coordinates are entered.

---

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Leaflet.js
- Open Notify ISS API
- ISS Pass Prediction API
- GitHub
- GitHub Pages

---

## Project Structure

```text
ISS-Tracker-and-Orbit-Map/
│
├── index.html
├── style.css
├── script.js
└── README.md

## Team Contributions

### @lavida-07 — Frontend Development

Responsible for:

- HTML structure
- Page sections
- Header
- Map section structure
- Current position section
- Prediction section
- Footer
- User interface structure

### @miley-kc — UI/UX and Styling

Responsible for:

- CSS styling
- Colour scheme
- Typography
- Responsive design
- Dark mode styling
- Buttons
- Information cards
- Map presentation
- ISS marker styling

### @lavida-07 — ISS Tracking

Responsible for:

- JavaScript implementation
- ISS API integration
- Real-time ISS coordinates
- Automatic position updates
- ISS map marker
- Map interaction
- Refresh functionality
- API error handling

### miley-kc — Prediction, Documentation and Deployment

Responsible for:

- ISS pass-over prediction
- Coordinate validation
- Prediction result presentation
- Project documentation
- GitHub repository management
- GitHub Pages deployment
- Final application testing
