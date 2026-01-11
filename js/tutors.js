let allTutors = [];
let filteredTutors = [];
let selectedTutorId = null;
let selectedTutor = null;

async function fetchTutors() {
    const response = await fetch(`${API_URL}tutors?api_key=${API_KEY}`);
    allTutors = await response.json();
    filteredTutors = allTutors;
    fillTutorLanguages();
    renderTutors();
}

function fillTutorLanguages() {
    const select = document.getElementById("tutor-language");
    if (!select) return;
    const languages = new Set();
    allTutors.forEach(tutor => tutor.languages_offered.forEach(lang => languages.add(lang)));
    languages.forEach(lang => {
        const option = document.createElement("option");
        option.value = lang;
        option.textContent = lang;
        select.appendChild(option);
    });
}

function filterTutors() {
    const languageEl = document.getElementById("tutor-language");
    const levelEl = document.getElementById("tutor-level");
    const language = languageEl ? languageEl.value : "";
    const level = levelEl ? levelEl.value : "";

    filteredTutors = allTutors.filter(tutor => {
        const byLanguage = language ? tutor.languages_offered.includes(language) : true;
        const byLevel = level ? tutor.language_level === level : true;
        return byLanguage && byLevel;
    });

    selectedTutorId = null;
    const orderBtn = document.getElementById("order-tutor-btn");
    if (orderBtn) orderBtn.disabled = true;

    renderTutors();
}

function renderTutors() {
    const container = document.getElementById("tutors-container");
    if (!container) return;
    container.innerHTML = "";

    filteredTutors.forEach(tutor => {
        const col = document.createElement("div");
        col.className = "col-md-6 mb-3";

        col.innerHTML = `
            <div class="card tutor-card h-100" data-id="${tutor.id}">
                <div class="card-body d-flex gap-3 align-items-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/4519/4519678.png" width="80" height="80" class="rounded flex-shrink-0" alt="Фото">
                    <div>
                        <h5 class="mb-1">${tutor.name}</h5>
                        <p class="mb-1">Уровень: ${tutor.language_level}</p>
                        <p class="mb-1">Языки: ${tutor.languages_offered.join(", ")}</p>
                        <p class="mb-1">Опыт: ${tutor.work_experience} лет</p>
                        <p class="fw-bold mb-0">${tutor.price_per_hour} ₽ / час</p>
                    </div>
                </div>
            </div>
        `;

        const card = col.querySelector(".tutor-card");
        if (card) card.addEventListener("click", () => toggleTutorSelection(tutor.id));
        container.appendChild(col);
    });
}

function toggleTutorSelection(id) {
    const cards = document.querySelectorAll(".tutor-card");
    cards.forEach(card => card.classList.remove("selected"));

    if (selectedTutorId === id) {
        selectedTutorId = null;
        const orderBtn = document.getElementById("order-tutor-btn");
        if (orderBtn) orderBtn.disabled = true;
        return;
    }

    selectedTutorId = id;
    const el = document.querySelector(`.tutor-card[data-id="${id}"]`);
    if (el) el.classList.add("selected");
    const orderBtn = document.getElementById("order-tutor-btn");
    if (orderBtn) orderBtn.disabled = false;
}

function openTutorOrderModal(tutor) {
    selectedTutor = tutor;
    const nameEl = document.getElementById("tutor-name");
    const priceEl = document.getElementById("tutor-price");
    const durationEl = document.getElementById("tutor-duration");
    const dateEl = document.getElementById("tutor-date");
    const emailEl = document.getElementById("tutor-email");
    const messageEl = document.getElementById("tutor-message");

    if (nameEl) nameEl.value = tutor.name;
    if (priceEl) priceEl.value = `${tutor.price_per_hour} ₽ / час`;
    if (durationEl) durationEl.value = 1;
    if (dateEl) dateEl.value = "";
    if (emailEl) emailEl.value = "";
    if (messageEl) messageEl.value = "";

    fillTutorTimes();
    calculateTutorPrice();

    const modalEl = document.getElementById("tutorOrderModal");
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

function fillTutorTimes() {
    const select = document.getElementById("tutor-time");
    if (!select) return;
    select.innerHTML = `<option value="">Выберите время</option>`;
    for (let h = 9; h <= 20; h++) {
        const time = `${String(h).padStart(2, "0")}:00`;
        select.innerHTML += `<option value="${time}">${time}</option>`;
    }
}

function calculateTutorPrice() {
    if (!selectedTutor) return;
    const durationEl = document.getElementById("tutor-duration");
    let hours = durationEl ? Number(durationEl.value) : 1;
    if (isNaN(hours) || hours < 1) hours = 1;
    if (hours > 40) hours = 40;
    if (durationEl) durationEl.value = hours;
    const price = hours * selectedTutor.price_per_hour;
    const totalEl = document.getElementById("tutor-total-price");
    if (totalEl) totalEl.textContent = price;
}

document.addEventListener("DOMContentLoaded", () => {
    const orderTutorBtn = document.getElementById("order-tutor-btn");
    if (orderTutorBtn) {
        orderTutorBtn.addEventListener("click", () => {
            selectedTutor = allTutors.find(t => t.id === selectedTutorId);
            if (selectedTutor) openTutorOrderModal(selectedTutor);
        });
    }

    const tutorLanguage = document.getElementById("tutor-language");
    if (tutorLanguage) tutorLanguage.addEventListener("change", filterTutors);

    const tutorLevel = document.getElementById("tutor-level");
    if (tutorLevel) tutorLevel.addEventListener("change", filterTutors);

    const durationEl = document.getElementById("tutor-duration");
    if (durationEl) {
        durationEl.addEventListener("blur", e => {
            let value = Number(e.target.value);
            if (isNaN(value) || value < 1) value = 1;
            if (value > 40) value = 40;
            e.target.value = value;
            calculateTutorPrice();
        });
    }

    const submitTutorOrder = document.getElementById("submit-tutor-order");
    if (submitTutorOrder) {
        submitTutorOrder.addEventListener("click", async () => {
            if (!selectedTutor) return;
            const data = {
                tutor_id: selectedTutor.id,
                date_start: document.getElementById("tutor-date") ? document.getElementById("tutor-date").value : "",
                time_start: document.getElementById("tutor-time") ? document.getElementById("tutor-time").value : "",
                duration: Number(document.getElementById("tutor-duration") ? document.getElementById("tutor-duration").value : 1),
                price: Number(document.getElementById("tutor-total-price") ? document.getElementById("tutor-total-price").textContent : 0),
                persons: 1
            };

            try {
                const response = await fetch(`${API_URL}orders?api_key=${API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });

                if (!response.ok) throw new Error();

                const modalEl = document.getElementById("tutorOrderModal");
                if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
                const form = document.getElementById("tutor-order-form");
                if (form) form.reset();
                alert("Заявка отправлена!");
            } catch {
                alert("Ошибка отправки заявки");
            }
        });
    }

    if (document.getElementById("tutors-container")) fetchTutors();
});
