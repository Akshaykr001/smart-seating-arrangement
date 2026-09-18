/**
 * Smart Examination Seating Arrangement - Interactive UI Engine
 */

document.addEventListener("DOMContentLoaded", () => {
    initPresets();
    initRoomPreview();
    initColorCodingToggle();
    initTableSearch();
});

// Preset Configurations
const PRESETS = {
    balanced: {
        num_rooms: 1,
        rows: 4,
        cols: 3,
        seats_per_bench: 2,
        accessible_rule: "row_1_and_aisle",
        invigilator_ratio: 20,
        adjacency_rule: "orthogonal",
        csv_data: `ID,Class,Subject,Special_Needs
STU001,CSE Gen,DSA,Y
STU002,CSE IBM,Design Thinking,N
STU003,CSE Gen,DSA,N
STU004,CSE IBM,Design Thinking,N
STU005,CSE Gen,Python,N
STU006,CSE IBM,Python,N
STU007,CSE AIML,DSA,Y
STU008,CSE Gen,Design Thinking,N
STU009,CSE IBM,DSA,N
STU010,CSE AIML,Python,N
STU011,CSE Gen,DSA,N
STU012,CSE IBM,Design Thinking,N
STU013,CSE AIML,Python,N
STU014,CSE Gen,Design Thinking,N
STU015,CSE IBM,DSA,N
STU016,CSE AIML,DSA,N
STU017,CSE Gen,Python,N
STU018,CSE IBM,DSA,N`
    },
    pigeonhole: {
        num_rooms: 1,
        rows: 4,
        cols: 2,
        seats_per_bench: 2, // 16 seats total, alpha = 8
        accessible_rule: "row_1",
        invigilator_ratio: 15,
        adjacency_rule: "orthogonal",
        csv_data: `ID,Class,Subject,Special_Needs
STU001,CSE AIML,Maths,Y
STU002,CSE CSBS,Physics,N
STU003,CSE Gen,Chemistry,N
STU004,CSE IBM,Biology,N
STU005,CSE AIML,Maths,N
STU006,CSE CSBS,Physics,N
STU007,CSE Gen,Chemistry,N
STU008,CSE IBM,Biology,N
STU009,CSE AIML,Maths,N
STU010,CSE CSBS,Physics,N
STU011,CSE Gen,Chemistry,N
STU012,CSE IBM,Biology,N
STU013,CSE AIML,Maths,Y
STU014,CSE CSBS,Physics,N`
    },
    multiroom: {
        num_rooms: 2,
        rows: 3,
        cols: 3,
        seats_per_bench: 2, // 18 seats per room = 36 seats total
        accessible_rule: "row_1_and_aisle",
        invigilator_ratio: 15,
        adjacency_rule: "orthogonal",
        csv_data: `ID,Class,Subject,Special_Needs
MR-001,CSE Gen,Chemistry,Y
MR-002,CSE IBM,Python,N
MR-003,CSE AIDE,Chemistry,N
MR-004,CSE Gen,Python,N
MR-005,CSE IBM,Chemistry,N
MR-006,CSE AIDE,Python,N
MR-007,CSE Gen,Chemistry,N
MR-008,CSE IBM,Python,N
MR-009,CSE AIDE,Chemistry,N
MR-010,CSE Gen,Python,Y
MR-011,CSE IBM,Chemistry,N
MR-012,CSE AIDE,Python,N
MR-013,CSE Gen,Chemistry,N
MR-014,CSE IBM,Python,N
MR-015,CSE AIDE,Chemistry,N
MR-016,CSE Gen,Python,N
MR-017,CSE IBM,Chemistry,N
MR-018,CSE AIDE,Python,N
MR-019,CSE Gen,Chemistry,N
MR-020,CSE IBM,Python,N
MR-021,CSE AIDE,Chemistry,Y
MR-022,CSE Gen,Python,N
MR-023,CSE IBM,Chemistry,N
MR-024,CSE AIDE,Python,N
MR-025,CSE Gen,Chemistry,N
MR-026,CSE IBM,Python,N
MR-027,CSE AIDE,Chemistry,N
MR-028,CSE Gen,Python,N
MR-029,CSE IBM,Chemistry,N
MR-030,CSE AIDE,Python,N`
    }
};

function initPresets() {
    const chips = document.querySelectorAll(".preset-chip");
    if (!chips.length) return;

    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            const presetKey = chip.dataset.preset;
            const config = PRESETS[presetKey];
            if (!config) return;

            // Set form values
            const form = document.getElementById("seating-form");
            if (!form) return;

            form.querySelector("[name='num_rooms']").value = config.num_rooms;
            form.querySelector("[name='rows']").value = config.rows;
            form.querySelector("[name='cols']").value = config.cols;
            form.querySelector("[name='seats_per_bench']").value = config.seats_per_bench;
            form.querySelector("[name='accessible_rule']").value = config.accessible_rule;
            form.querySelector("[name='invigilator_ratio']").value = config.invigilator_ratio;
            
            const diagRadio = form.querySelector(`[name='adjacency_rule'][value='${config.adjacency_rule}']`);
            if (diagRadio) diagRadio.checked = true;

            const textarea = form.querySelector("[name='student_data_text']");
            if (textarea) textarea.value = config.csv_data;

            // Highlight active preset chip
            chips.forEach(c => c.style.borderColor = "var(--border-color)");
            chip.style.borderColor = "var(--accent-primary)";

            updateCapacityPreview();
        });
    });
}

function initRoomPreview() {
    const inputs = ["num_rooms", "rows", "cols", "seats_per_bench"];
    inputs.forEach(id => {
        const el = document.querySelector(`[name='${id}']`);
        if (el) {
            el.addEventListener("input", updateCapacityPreview);
            el.addEventListener("change", updateCapacityPreview);
        }
    });
    updateCapacityPreview();
}

function updateCapacityPreview() {
    const numRoomsEl = document.querySelector("[name='num_rooms']");
    const rowsEl = document.querySelector("[name='rows']");
    const colsEl = document.querySelector("[name='cols']");
    const seatsEl = document.querySelector("[name='seats_per_bench']");

    if (!numRoomsEl || !rowsEl || !colsEl || !seatsEl) return;

    const rooms = parseInt(numRoomsEl.value) || 1;
    const rows = parseInt(rowsEl.value) || 1;
    const cols = parseInt(colsEl.value) || 1;
    const seatsPerBench = parseInt(seatsEl.value) || 1;

    const seatsPerRoom = rows * cols * seatsPerBench;
    const totalCapacity = rooms * seatsPerRoom;
    const alphaEstimate = Math.ceil(seatsPerRoom / 2) * rooms;

    const previewEl = document.getElementById("capacity-preview");
    if (previewEl) {
        previewEl.innerHTML = `
            <strong>Room Layout Capacity:</strong> 
            <span style="color: var(--accent-secondary);">${rooms} Room(s)</span> &bull; 
            <span>${seatsPerRoom} seats/room</span> &bull; 
            <span style="color: var(--accent-emerald); font-weight: 700;">${totalCapacity} Total Seats</span> &bull; 
            <span style="color: #a5b4fc;">Max Independent Set &alpha;(G) &approx; ${alphaEstimate}</span>
        `;
    }
}

function initColorCodingToggle() {
    const toggleBtns = document.querySelectorAll(".view-toggle-btn");
    if (!toggleBtns.length) return;

    toggleBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.dataset.mode; // 'class' or 'subject'
            toggleBtns.forEach(b => {
                b.classList.remove("btn-primary");
                b.classList.add("btn-outline");
            });
            btn.classList.add("btn-primary");
            btn.classList.remove("btn-outline");

            const seatBadges = document.querySelectorAll(".student-badge-display");
            seatBadges.forEach(badge => {
                if (mode === "subject") {
                    badge.textContent = badge.dataset.subject;
                    badge.className = `student-class-badge student-badge-display color-class-${badge.dataset.subjectColorIdx}`;
                } else {
                    badge.textContent = badge.dataset.class;
                    badge.className = `student-class-badge student-badge-display color-class-${badge.dataset.classColorIdx}`;
                }
            });
        });
    });
}

function initTableSearch() {
    const searchInput = document.getElementById("allocation-search");
    const table = document.getElementById("allocation-table");
    if (!searchInput || !table) return;

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase().trim();
        const rows = table.querySelectorAll("tbody tr");

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? "" : "none";
        });
    });
}
