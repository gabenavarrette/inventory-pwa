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
 * Placeholder function for rendering location navigation tabs
 */
function renderLocationTabs() {
    console.log("Database payload received. Available Locations:", App.db.locations);
    // We will build this out in the next step to populate our checklist UI!
}
