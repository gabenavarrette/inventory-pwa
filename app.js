// ==========================================================================
// PantryPilot State Engine
// ==========================================================================

// 1. The Global Application State
const App = {
    // API Configuration
    apiUrl: "https://script.google.com/macros/s/AKfycbw2HByzD7YmK6RLxahEE7eOzXpji35rbhQd37FstJ9C9ny-JaWma7OyQHejVSglE1LsMw/exec",
    
    // Core Relational Data Models fetched from Google Sheets
    db: {
        vendors: [],
        locations: [],
        items: [],
        item_locations: []
    },
    
    // Active App State Tracking
    currentView: 'view-inventory',
    currentLocationId: null,
    
    // Working memory for temporary user counts before saving: { mapping_id: count_number }
    unsavedCounts: {}
};

// 2. DOM Initialization & View Switcher Routing
document.addEventListener("DOMContentLoaded", () => {
    initializeViewSwitcher();
    
    // Check if there's a previous walkthrough saved on the phone
    const savedSession = localStorage.getItem("pantry_pilot_counts");
    if (savedSession) {
        App.unsavedCounts = JSON.parse(savedSession);
        console.log("Restored previous active counting session from cache.");
    }
    
    initializeDatabase();
});

/**
 * Attaches event listeners to the bottom navigation bar items
 * to seamlessly swap active screens without a page reload.
 */
function initializeViewSwitcher() {
    const navItems = document.querySelectorAll(".bottom-nav .nav-item");
    
    navItems.forEach(button => {
        button.addEventListener("click", (e) => {
            // Find the closest button element to handle accidental clicks on the icon span
            const targetBtn = e.target.closest(".nav-item");
            const targetViewId = targetBtn.getAttribute("data-target");
            
            switchView(targetViewId);
        });
    });
}

/**
 * Handles the CSS toggle logic to hide the old view and show the new one.
 */
function switchView(viewId) {
    // Update internal state tracker
    App.currentView = viewId;
    
    // Remove active class from all views, then add to target view
    document.querySelectorAll(".app-view").forEach(view => {
        view.classList.remove("active");
    });
    document.getElementById(viewId).classList.add("active");
    
    // Update active visual indicator on navigation buttons
    document.querySelectorAll(".bottom-nav .nav-item").forEach(btn => {
        btn.classList.remove("active");
        if (btn.getAttribute("data-target") === viewId) {
            btn.classList.add("active");
        }
    });

    // Run view-specific update routines if needed when opening a tab
    if (viewId === 'view-orders') {
        // Future render hook for the order guide calculation engine
        console.log("Switched to Order View: Regenerating shopping list...");
    }
}

/**
 * Kicks off our data pipeline fetch from Google Sheets
 */
async function initializeDatabase() {
    const statusText = document.getElementById("connection-status");
    
    try {
        statusText.textContent = "Fetching live data...";
        
        const response = await fetch(App.apiUrl);
        if (!response.ok) throw new Error("Network response was not stable.");
        
        const rawJson = await response.json();
        
        // Populate our state engine memory with relational tables
        App.db.vendors = rawJson.vendors || [];
        App.db.locations = rawJson.locations || [];
        App.db.items = rawJson.items || [];
        App.db.item_locations = rawJson.item_locations || [];
        
        // Update Admin Settings Interface Metrics
        document.getElementById("stat-items").textContent = App.db.items.length;
        document.getElementById("stat-vendors").textContent = App.db.vendors.length;
        
        statusText.textContent = "Database Connected";
        statusText.style.color = "var(--pico-ins-color)"; // Native Pico green alert color
        
        // Core initialization step: Render our location tabs
        renderLocationTabs();
        
    } catch (error) {
        console.error("Database initialization failed:", error);
        statusText.textContent = "Offline / Connection Error";
        statusText.style.color = "var(--pico-del-color)"; // Native Pico red alert color
    }
}

/**
 * Generates navigation buttons for each location found in the database
 */
function renderLocationTabs() {
    const tabsContainer = document.getElementById("location-tabs");
    tabsContainer.innerHTML = ""; // Clear out any placeholder text

    App.db.locations.forEach(loc => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "outline"; // Pico custom style for secondary buttons
        button.textContent = loc.location_name;
        button.setAttribute("data-location-id", loc.location_id);

        // Add tap listener to switch active inventory rooms
        button.addEventListener("click", () => {
            selectLocation(loc.location_id);
        });

        tabsContainer.appendChild(button);
    });

    // Auto-select the very first location room to populate the view on startup
    if (App.db.locations.length > 0) {
        selectLocation(App.db.locations[0].location_id);
    }
}

/**
 * Handles highlighting the active tab button and tracking the selected location
 */
function selectLocation(locationId) {
    App.currentLocationId = locationId;

    // Manage Pico styling states across tab buttons
    const buttons = document.querySelectorAll("#location-tabs button");
    buttons.forEach(btn => {
        const btnId = Number(btn.getAttribute("data-location-id"));
        if (btnId === locationId) {
            btn.classList.remove("outline"); // Make active button look solid
        } else {
            btn.classList.add("outline");    // Dim inactive button paths
        }
    });

    // Unlock the save button container frame
    document.getElementById("btn-save-inventory").removeAttribute("disabled");

    // Re-render item checklist matching only this location area
    renderInventoryList();
}

/**
 * Filters and compiles items assigned to the selected location room
 */
function renderInventoryList() {
    const listContainer = document.getElementById("inventory-list");
    listContainer.innerHTML = ""; // Wipe the old room items view

    // 1. Find all relational mappings for our currently active location
    const currentMappings = App.db.item_locations.filter(mapping => 
        Number(mapping.location_id) === Number(App.currentLocationId)
    );

    if (currentMappings.length === 0) {
        listContainer.innerHTML = "<p>No items assigned to this zone.</p>";
        return;
    }

    // 2. Loop over mapping logs, join item names, and draw UI cards
    currentMappings.forEach(mapping => {
        // Find corresponding core descriptive item details matching foreign key
        const itemDetails = App.db.items.find(item => 
            Number(item.item_id) === Number(mapping.item_id)
        );

        if (!itemDetails) return; // Skip if database integrity fails

        // Check if there's an active unsaved changes count in working memory, otherwise default to 0
        const currentCount = App.unsavedCounts[mapping.mapping_id] !== undefined 
            ? App.unsavedCounts[mapping.mapping_id] 
            : 0;

        // Create Pico article element box frame
        const article = document.createElement("article");
        article.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; wrap: wrap;">
                <div>
                    <h4 style="margin: 0;">${itemDetails.item_name}</h4>
                    <small>Par Level: ${mapping.par_level} ${itemDetails.count_unit}</small>
                </div>
                
                <div class="counter-stepper">
                    <button type="button" class="outline contrast" onclick="updateCount(${mapping.mapping_id}, -1)">-</button>
                    <input type="number" id="input-map-${mapping.mapping_id}" value="${currentCount}" min="0" readonly>
                    <button type="button" class="outline contrast" onclick="updateCount(${mapping.mapping_id}, 1)">+</button>
                </div>
            </div>
        `;

        listContainer.appendChild(article);
    });
}

/**
 * Increments or decrements count values inside active state working memory
 */
window.updateCount = function(mappingId, change) {
    if (App.unsavedCounts[mappingId] === undefined) {
        App.unsavedCounts[mappingId] = 0;
    }

    // Process new mathematical adjustments safely
    let newCount = App.unsavedCounts[mappingId] + change;
    if (newCount < 0) newCount = 0; // Prevent inventory counts from dipping below zero

    // Store value modification into state memory
    App.unsavedCounts[mappingId] = newCount;

    // Instantly reflect internal changes inside input field display view
    const inputElement = document.getElementById(`input-map-${mappingId}`);
    if (inputElement) {
        inputElement.value = newCount;
    }
};
