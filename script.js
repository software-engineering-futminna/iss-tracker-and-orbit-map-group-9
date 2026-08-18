const ISS_API_URL =
    "https://api.wheretheiss.at/v1/satellites/25544";

const PASS_API_URL =
    "https://iss-api.polluxlabs.io/iss-pass";

const UPDATE_INTERVAL =
    5000;

/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */
let map = null;
let issMarker = null;
let updateTimer = null;
let lastSuccessfulPosition = null;
let isRefreshing = false;

/* =========================================================
   DOM ELEMENTS
   ========================================================= */
const refreshButton =
    document.getElementById("refreshButton");
const refreshIcon =
    document.getElementById("refreshIcon");
const refreshText =
    document.getElementById("refreshText");
const themeToggle =
    document.getElementById("themeToggle");
const themeIcon =
    document.getElementById("themeIcon");
const latitudeDisplay =
    document.getElementById("latitude");
const longitudeDisplay =
    document.getElementById("longitude");
const lastUpdatedDisplay =
    document.getElementById("lastUpdated");
const connectionStatus =
    document.getElementById("connectionStatus");
const connectionDetail =
    document.getElementById("connectionDetail");
const mapCoordinates =
    document.getElementById("mapCoordinates");
const mapStatus =
    document.getElementById("mapStatus");
const systemStatus =
    document.getElementById("systemStatus");
const systemStatusText =
    document.getElementById("systemStatusText");
const predictionForm =
    document.getElementById("predictionForm");
const predictionLatitude =
    document.getElementById("predictionLatitude");
const predictionLongitude =
    document.getElementById("predictionLongitude");
const latitudeError =
    document.getElementById("latitudeError");
const longitudeError =
    document.getElementById("longitudeError");
const predictButton =
    document.getElementById("predictButton");
const predictButtonText =
    document.getElementById("predictButtonText");
const predictionResult =
    document.getElementById("predictionResult");

/* ===================
   START APPLICATION
   ==================*/

document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
);
function initializeApplication() {
    initializeTheme();
    initializeMap();
    setupEventListeners();
    fetchISSPosition();
    startAutomaticUpdates();
}

/* =========================================================
   MAP INITIALIZATION
   ========================================================= */
function initializeMap() {
    if (typeof L === "undefined") {
        console.error(
            "Leaflet is not loaded."
        );
        return;
    }

    const mapElement =
        document.getElementById("map");

    if (!mapElement) {
        console.error(
            "Map container was not found."
        );
        return;
    }

    map =
        L.map(
            mapElement,
            {
                center: [20, 0],
                zoom: 2,
                minZoom: 2,
                maxZoom: 8,
                zoomControl: true,
                worldCopyJump: false
            }
        );

    /* =====================================================
       REALISTIC EARTH MAP
       ===================================================== */
    L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            attribution:
                "Tiles © Esri",
            maxZoom:
                18,
            noWrap:
                false
        }
    ).addTo(map);

    /* =====================================================
       COUNTRY LABELS
       ===================================================== */
    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
        {
            attribution:
                "© CARTO",
            subdomains:
                "abcd",
            maxZoom:
                19,
            pane:
                "overlayPane"
        }
    ).addTo(map);

    /* =====================================================
       SINGLE ISS MARKER
       ===================================================== */
    issMarker =
        L.marker(
            [0, 0],
            {
                icon:
                    createISSIcon(),
                title:
                    "International Space Station",
                zIndexOffset:
                    1000
            }
        );

    issMarker.bindPopup(
        "<strong>ISS</strong><br>" +
        "International Space Station"
    );

    issMarker.addTo(map);

    /* =====================================================
       WORLD VIEW
       ===================================================== */
    setTimeout(
        function () {
            map.fitBounds(
                [
                    [-60, -180],
                    [75, 180]
                ],
                {
                    animate:
                        false
                }
            );
            map.invalidateSize();
        },
        300
    );
}

/* =========================================================
   ISS MARKER
   ========================================================= */
function createISSIcon() {
    return L.divIcon(
        {
            className:
                "iss-marker-container",
            html:
                `
                <div class="iss-marker-wrapper">

                    <div class="iss-marker-pulse"></div>

                    <div class="iss-marker-core">
                    </div>
                </div>
                `,
            iconSize:
                [50, 50],
            iconAnchor:
                [25, 25],
            popupAnchor:
                [0, -25]
        }
    );
}

/* =========================================================
   FETCH LIVE ISS POSITION
   ========================================================= */
async function fetchISSPosition() {
    try {
        const response =
            await fetch(
                `${ISS_API_URL}?units=kilometers&_=${Date.now()}`,
                {
                    method:
                        "GET",
                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `ISS API returned ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "ISS position:",
            data
        );


        /* =================================================
           VALIDATE RESPONSE
           ================================================= */

        const latitude =
            Number(data.latitude);

        const longitude =
            Number(data.longitude);


        if (

            !Number.isFinite(latitude) ||

            !Number.isFinite(longitude) ||

            latitude < -90 ||

            latitude > 90 ||

            longitude < -180 ||

            longitude > 180

        ) {

            throw new Error(
                "Invalid ISS coordinates."
            );

        }


        /* =================================================
           TIMESTAMP
           ================================================= */

        const timestamp =

            data.timestamp

                ? new Date(
                    Number(data.timestamp) * 1000
                )

                : new Date();


        const position = {

            latitude:
                latitude,

            longitude:
                longitude,

            timestamp:
                timestamp

        };


        lastSuccessfulPosition =
            position;


        /* =================================================
           UPDATE EXISTING MARKER
           ================================================= */

        updateISSMarker(
            latitude,
            longitude
        );


        /* =================================================
           UPDATE INFORMATION
           ================================================= */

        updatePositionDisplay(
            position
        );


        /* =================================================
           LIVE STATUS
           ================================================= */

        updateConnectionStatus(
            "LIVE",
            "Receiving live ISS data"
        );


        updateSystemStatus(
            "connected",
            "Connected to ISS tracking service"
        );

    }

    catch (error) {

        console.error(
            "Unable to retrieve ISS position:",
            error
        );


        handleAPIError();

    }

}


/* =========================================================
   UPDATE ISS MARKER
   ========================================================= */

function updateISSMarker(latitude, longitude) {

    if (!map) {
        console.warn("Map is not initialized.");
        return;
    }

    /*
     * Create the ISS marker if it does not exist.
     * After that, every update only moves the same marker.
     */

    if (!issMarker) {

        const issIcon = L.divIcon({
            className: "iss-marker",
            html: `
                <div class="iss-marker-wrapper">
                    <div class="iss-marker-pulse"></div>
                    <div class="iss-marker-core"></div>
                </div>
            `,
            iconSize: [50, 50],
            iconAnchor: [25, 25]
        });

        issMarker = L.marker(
            [latitude, longitude],
            {
                icon: issIcon,
                zIndexOffset: 1000
            }
        ).addTo(map);

    } else {

        /*
         * Existing marker:
         * simply move it to the latest ISS position.
         */

        issMarker.setLatLng([
            latitude,
            longitude
        ]);
    }


    /*
     * Update coordinate display on the map.
     */

    if (mapCoordinates) {

        mapCoordinates.textContent =
            `${latitude.toFixed(3)}° , ` +
            `${longitude.toFixed(3)}°`;
    }


    /*
     * Update map tracking status.
     */

    if (mapStatus) {

        const statusText =
            mapStatus.querySelector(
                "span:last-child"
            );

        if (statusText) {
            statusText.textContent =
                "Tracking";
        }
    }
}


/* =========================================================
   POSITION DISPLAY
   ========================================================= */

function updatePositionDisplay(
    position
) {

    if (latitudeDisplay) {

        latitudeDisplay.textContent =
            `${position.latitude.toFixed(3)}°`;

    }


    if (longitudeDisplay) {

        longitudeDisplay.textContent =
            `${position.longitude.toFixed(3)}°`;

    }


    if (lastUpdatedDisplay) {

        lastUpdatedDisplay.textContent =
            formatTime(
                position.timestamp
            );

    }


    if (connectionStatus) {

        connectionStatus.textContent =
            "LIVE";

    }


    if (connectionDetail) {

        connectionDetail.textContent =
            "Receiving live ISS data";

    }

}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatTime(
    date
) {

    if (
        !(date instanceof Date) ||
        Number.isNaN(date.getTime())
    ) {

        return "Unavailable";

    }


    return date.toLocaleTimeString(
        undefined,
        {
            hour:
                "numeric",

            minute:
                "2-digit",

            second:
                "2-digit"
        }
    );

}


/* =========================================================
   CONNECTION STATUS
   ========================================================= */

function updateConnectionStatus(
    status,
    detail
) {

    if (connectionStatus) {

        connectionStatus.textContent =
            status;

    }


    if (connectionDetail) {

        connectionDetail.textContent =
            detail;

    }

}


/* =========================================================
   SYSTEM STATUS
   ========================================================= */

function updateSystemStatus(
    state,
    message
) {

    if (!systemStatus) {

        return;
    }


    systemStatus.classList.remove(
        "error",
        "loading"
    );


    if (state === "error") {

        systemStatus.classList.add(
            "error"
        );

    }


    if (state === "loading") {

        systemStatus.classList.add(
            "loading"
        );

    }


    if (systemStatusText) {

        systemStatusText.textContent =
            message;

    }

}


/* =========================================================
   API ERROR HANDLING
   ========================================================= */

function handleAPIError() {

    updateConnectionStatus(
        "ERROR",
        "Temporary connection problem"
    );


    updateSystemStatus(
        "error",
        "Unable to retrieve the latest ISS position. Please try again."
    );


    if (mapStatus) {

        const statusText =
            mapStatus.querySelector(
                "span:last-child"
            );


        if (statusText) {

            statusText.textContent =
                "Connection error";

        }

    }


    /*
     * IMPORTANT:
     * We keep the last successful position.
     * We do not remove the marker.
     */

    if (
        lastSuccessfulPosition &&
        mapCoordinates
    ) {

        mapCoordinates.textContent =

            `${lastSuccessfulPosition.latitude.toFixed(3)}° , ` +
            `${lastSuccessfulPosition.longitude.toFixed(3)}°`;

    }

}


/* =========================================================
   MANUAL REFRESH
   ========================================================= */

async function refreshISSPosition() {

    if (isRefreshing) {

        return;
    }


    isRefreshing =
        true;


    setRefreshLoadingState(
        true
    );


    updateSystemStatus(
        "loading",
        "Updating ISS position..."
    );


    try {

        await fetchISSPosition();

    }

    finally {

        isRefreshing =
            false;

        setRefreshLoadingState(
            false
        );

    }

}


/* =========================================================
   REFRESH BUTTON STATE
   ========================================================= */

function setRefreshLoadingState(
    loading
) {

    if (!refreshButton) {

        return;
    }


    refreshButton.disabled =
        loading;


    refreshButton.classList.toggle(
        "refreshing",
        loading
    );


    if (refreshText) {

        refreshText.textContent =

            loading

                ? "Updating..."

                : "Refresh";

    }


    if (refreshIcon) {

        refreshIcon.textContent =
            "↻";

    }

}


/* =========================================================
   AUTOMATIC UPDATES
   ========================================================= */

function startAutomaticUpdates() {

    if (updateTimer) {

        clearInterval(
            updateTimer
        );

    }


    updateTimer =
        setInterval(

            function () {

                if (!isRefreshing) {

                    fetchISSPosition();

                }

            },

            UPDATE_INTERVAL

        );

}


/* =========================================================
   VALIDATE COORDINATES
   ========================================================= */

function validateCoordinates(
    latitude,
    longitude
) {

    let valid =
        true;


    clearValidationErrors();


    const lat =
        Number(latitude);

    const lon =
        Number(longitude);


    /* Latitude */

    if (

        latitude === "" ||

        !Number.isFinite(lat) ||

        lat < -90 ||

        lat > 90

    ) {

        if (latitudeError) {

            latitudeError.textContent =
                "Please enter a valid latitude between -90° and 90°.";

        }


        if (predictionLatitude) {

            predictionLatitude.classList.add(
                "input-invalid"
            );

        }


        valid =
            false;

    }


    /* Longitude */

    if (

        longitude === "" ||

        !Number.isFinite(lon) ||

        lon < -180 ||

        lon > 180

    ) {

        if (longitudeError) {

            longitudeError.textContent =
                "Please enter a valid longitude between -180° and 180°.";

        }


        if (predictionLongitude) {

            predictionLongitude.classList.add(
                "input-invalid"
            );

        }


        valid =
            false;

    }


    return valid;

}


/* =========================================================
   CLEAR VALIDATION ERRORS
   ========================================================= */

function clearValidationErrors() {

    if (latitudeError) {

        latitudeError.textContent =
            "";

    }


    if (longitudeError) {

        longitudeError.textContent =
            "";

    }


    if (predictionLatitude) {

        predictionLatitude.classList.remove(
            "input-invalid"
        );

    }


    if (predictionLongitude) {

        predictionLongitude.classList.remove(
            "input-invalid"
        );

    }

}


/* =========================================================
   PASS-OVER PREDICTION
   ========================================================= */

async function predictPassOver() {

    const latitude =
        predictionLatitude
            ? predictionLatitude.value.trim()
            : "";


    const longitude =
        predictionLongitude
            ? predictionLongitude.value.trim()
            : "";


    /* =====================================================
       VALIDATION
       ===================================================== */

    if (
        !validateCoordinates(
            latitude,
            longitude
        )
    ) {

        return;
    }


    setPredictionLoadingState(
        true
    );


    updateSystemStatus(
        "loading",
        "Calculating ISS pass-over..."
    );


    try {

        const url =

            `${PASS_API_URL}` +

            `?lat=${encodeURIComponent(latitude)}` +

            `&lon=${encodeURIComponent(longitude)}` +

            `&n=1`;


        console.log(
            "Pass-over request:",
            url
        );


        const response =
            await fetch(
                url,
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Pass-over API returned ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Pass-over response:",
            data
        );


        displayPredictionResult(
            data,
            latitude,
            longitude
        );


        updateSystemStatus(
            "connected",
            "Pass-over prediction calculated"
        );

    }

    catch (error) {

        console.error(
            "Pass-over prediction failed:",
            error
        );


        displayPredictionError();


        updateSystemStatus(
            "error",
            "Unable to calculate the pass-over prediction. Please try again."
        );

    }

    finally {

        setPredictionLoadingState(
            false
        );

    }

}


/* =========================================================
   DISPLAY PASS-OVER RESULT
   ========================================================= */

function displayPredictionResult(
    data,
    latitude,
    longitude
) {

    if (!predictionResult) {

        console.error(
            "Prediction result container not found."
        );

        return;
    }


    const pass =
        data?.passes?.[0];


    if (!pass) {

        predictionResult.innerHTML = `

            <div class="result-placeholder">

                <p>
                    No upcoming ISS pass-over
                    was found for this location.
                </p>

            </div>

        `;

        return;
    }


    /* =====================================================
       PASS DATA
       ===================================================== */

    const rise =
        pass.rise || {};


    const set =
        pass.set || {};


    const culmination =
        pass.culmination || {};


    const expectedPass =
        formatPredictionTime(
            rise.time
        );


    const passEnds =
        formatPredictionTime(
            set.time
        );


    const duration =
        Number(
            pass.duration_sec
        );


    const elevation =
        Number(
            culmination.elevation_deg
        );


    const riseDirection =
        rise.compass ||
        "Unavailable";


    const setDirection =
        set.compass ||
        "Unavailable";


    const visibility =

        pass.visible === true

            ? "Visible"

            : pass.visible === false

                ? "Not visible"

                : "Unavailable";


    /* =====================================================
       DISPLAY
       ===================================================== */

    predictionResult.innerHTML = `

        <div class="prediction-success">


            <div class="prediction-value">

                <span>
                    Location
                </span>

                <strong>
                    ${Number(latitude).toFixed(4)}°,
                    ${Number(longitude).toFixed(4)}°
                </strong>

            </div>


            <div class="prediction-value">

                <span>
                    Expected Pass
                </span>

                <strong>
                    ${escapeHTML(
                        expectedPass
                    )}
                </strong>

            </div>


            <div class="prediction-value">

                <span>
                    Pass Ends
                </span>

                <strong>
                    ${escapeHTML(
                        passEnds
                    )}
                </strong>

            </div>


            <div class="prediction-value">

                <span>
                    Duration
                </span>

                <strong>
                    ${escapeHTML(
                        formatDuration(
                            duration
                        )
                    )}
                </strong>

            </div>


            <div class="prediction-value">

                <span>
                    Maximum Elevation
                </span>

                <strong>
                    ${
                        Number.isFinite(elevation)
                            ? `${elevation.toFixed(1)}°`
                            : "Unavailable"
                    }
                </strong>

            </div>


            <div class="prediction-value">

                <span>
                    Direction
                </span>

                <strong>
                    ${escapeHTML(
                        riseDirection
                    )}

                    →

                    ${escapeHTML(
                        setDirection
                    )}
                </strong>

            </div>


            <div class="prediction-value">

                <span>
                    Visibility
                </span>

                <strong>
                    ${visibility}
                </strong>

            </div>


        </div>


        <p class="prediction-message">

            The International Space Station is expected
            to pass over the selected location at the
            predicted time.

        </p>

    `;

}


/* =========================================================
   FORMAT PREDICTION TIME
   ========================================================= */

function formatPredictionTime(
    time
) {

    if (!time) {

        return "Unavailable";
    }


    const date =
        new Date(time);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Unavailable";
    }


    return date.toLocaleString(

        undefined,

        {
            dateStyle:
                "medium",

            timeStyle:
                "short"
        }

    );

}


/* =========================================================
   FORMAT DURATION
   ========================================================= */

function formatDuration(
    seconds
) {

    if (
        !Number.isFinite(seconds)
    ) {

        return "Unavailable";
    }


    const totalSeconds =
        Math.round(seconds);


    const minutes =
        Math.floor(
            totalSeconds / 60
        );


    const remainingSeconds =
        totalSeconds % 60;


    if (minutes === 0) {

        return `${remainingSeconds} seconds`;
    }


    if (remainingSeconds === 0) {

        return `${minutes} minutes`;
    }


    return (

        `${minutes} minutes ` +

        `${remainingSeconds} seconds`

    );

}


/* =========================================================
   PREDICTION LOADING STATE
   ========================================================= */

function setPredictionLoadingState(
    loading
) {

    if (predictButton) {

        predictButton.disabled =
            loading;

    }


    if (predictButtonText) {

        predictButtonText.textContent =

            loading

                ? "Calculating..."

                : "Predict Pass-Over";

    }


    if (
        loading &&
        predictionResult
    ) {

        predictionResult.innerHTML = `

            <div class="result-placeholder">

                <p>
                    Calculating the next ISS pass-over...
                </p>

            </div>

        `;

    }

}


/* =========================================================
   PREDICTION ERROR
   ========================================================= */

function displayPredictionError() {

    if (!predictionResult) {

        return;
    }


    predictionResult.innerHTML = `

        <div class="result-placeholder">

            <p>
                Unable to calculate the ISS
                pass-over right now.
                Please check your coordinates
                and try again.
            </p>

        </div>

    `;

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(
    value
) {

    const element =
        document.createElement(
            "div"
        );


    element.textContent =
        String(value);


    return element.innerHTML;

}


/* =========================================================
   DARK MODE
   ========================================================= */

function initializeTheme() {

    const savedTheme =
        localStorage.getItem(
            "iss-tracker-theme"
        );


    const isDark =
        savedTheme === "dark";


    document.body.classList.toggle(
        "dark-mode",
        isDark
    );


    if (themeIcon) {

        themeIcon.textContent =
            isDark
                ? "☀"
                : "☾";

    }

}


/* =========================================================
   TOGGLE DARK MODE
   ========================================================= */

function toggleDarkMode() {

    const isDark =
        document.body.classList.toggle(
            "dark-mode"
        );


    localStorage.setItem(

        "iss-tracker-theme",

        isDark
            ? "dark"
            : "light"

    );


    if (themeIcon) {

        themeIcon.textContent =
            isDark
                ? "☀"
                : "☾";

    }


    if (map) {

        setTimeout(
            function () {

                map.invalidateSize();

            },
            200
        );

    }

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {


    /* Manual refresh */

    if (refreshButton) {

        refreshButton.addEventListener(

            "click",

            refreshISSPosition

        );

    }


    /* Dark mode */

    if (themeToggle) {

        themeToggle.addEventListener(

            "click",

            toggleDarkMode

        );

    }


    /* Pass-over prediction */

    if (predictionForm) {

        predictionForm.addEventListener(

            "submit",

            function (event) {

                event.preventDefault();

                predictPassOver();

            }

        );

    }


    /* Latitude validation reset */

    if (predictionLatitude) {

        predictionLatitude.addEventListener(

            "input",

            function () {

                if (latitudeError) {

                    latitudeError.textContent =
                        "";

                }


                predictionLatitude.classList.remove(
                    "input-invalid"
                );

            }

        );

    }


    /* Longitude validation reset */

    if (predictionLongitude) {

        predictionLongitude.addEventListener(

            "input",

            function () {

                if (longitudeError) {

                    longitudeError.textContent =
                        "";

                }


                predictionLongitude.classList.remove(
                    "input-invalid"
                );

            }

        );

    }

}