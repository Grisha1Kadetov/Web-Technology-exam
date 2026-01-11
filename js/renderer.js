// не актулаьный файл, был разделен на api.js, courses.js и tutors.js
const API_URL =
    "http://exam-api-courses.std-900.ist.mospolytech.ru/api/";
const API_KEY =
    "0c882bbd-5f5c-4a2b-848c-eb5fca826a2b";
const COURSES_PER_PAGE = 6;

let allCourses = [];
let visibleCourses = [];
let currentPage = 1;
let selectedCourseForOrder = null;

let allTutors = [];
let filteredTutors = [];
let selectedTutorId = null;
let selectedTutor = null;

async function fetchCourses() {
    const response = await fetch(
        `${API_URL}courses?api_key=${API_KEY}`
    );

    allCourses = await response.json();
    visibleCourses = allCourses;

    render();
}

async function fetchTutors() {
    const response = await fetch(
        `${API_URL}tutors?api_key=${API_KEY}`
    );

    allTutors = await response.json();
    filteredTutors = allTutors;

    fillTutorLanguages();
    renderTutors();
}

function applyFilters() {
    const nameValue = document
        .getElementById("search-name")
        .value
        .toLowerCase();

    const levelValue = document
        .getElementById("search-level")
        .value;

    visibleCourses = allCourses.filter(course => {
        const byName = course.name
            .toLowerCase()
            .includes(nameValue);

        const byLevel = levelValue === ""
            ? true
            : course.level === levelValue;

        return byName && byLevel;
    });

    currentPage = 1;
    render();
}

function resetFilters() {
    document.getElementById("search-name").value = "";
    document.getElementById("search-level").value = "";

    visibleCourses = allCourses;
    currentPage = 1;
    render();
}

function render() {
    renderCourses();
    renderPagination();
}

function renderCourses() {
    const container =
        document.getElementById("courses-container");

    container.innerHTML = "";

    const start =
        (currentPage - 1) * COURSES_PER_PAGE;
    const end = start + COURSES_PER_PAGE;

    visibleCourses
        .slice(start, end)
        .forEach(course => {
            const col = document.createElement("div");
            col.className = "col-md-4 mb-4";

            col.innerHTML = `
                <div class="card course-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${course.name}</h5>
                        <p class="card-text">
                            Уровень: ${course.level}<br>
                            Преподаватель: ${course.teacher}
                        </p>
                        <button class="btn-primary-custom">
                            Подробнее
                        </button>
                    </div>
                </div>
            `;

            col
                .querySelector("button")
                .addEventListener("click", () =>
                    openCourseModal(course)
                );

            container.appendChild(col);
        });
}

function renderPagination() {
    const pagination =
        document.getElementById("courses-pagination");

    pagination.innerHTML = "";

    const pages = Math.ceil(
        visibleCourses.length / COURSES_PER_PAGE
    );

    if (pages <= 1) {
        return;
    }

    for (let i = 1; i <= pages; i++) {
        const li = document.createElement("li");
        li.className =
            `page-item ${i === currentPage ? "active" : ""}`;

        li.innerHTML =
            `<a class="page-link" href="#">${i}</a>`;

        li.addEventListener("click", e => {
            e.preventDefault();
            currentPage = i;
            render();
        });

        pagination.appendChild(li);
    }
}

function openCourseModal(course) {
    document.getElementById("courseModalTitle").textContent =
        course.name;

    document.getElementById("courseModalBody").innerHTML = `
        <p><strong>Описание:</strong> ${course.description}</p>
        <p><strong>Уровень:</strong> ${course.level}</p>
        <p><strong>Преподаватель:</strong> ${course.teacher}</p>
        <p><strong>Длительность:</strong> ${course.total_length} недель</p>
        <p><strong>Часов в неделю:</strong> ${course.week_length}</p>
        <p><strong>Стоимость:</strong> ${course.course_fee_per_hour} ₽ / час</p>

        <p><strong>Даты начала:</strong></p>
        <ul>
            ${course.start_dates
            .map(date =>
                `<li>${new Date(date).toLocaleString()}</li>`
            )
            .join("")}
        </ul>
    `;

    /* сохраняем id курса в кнопку */
    const enrollButton =
        document.getElementById("courseEnrollButton");

    enrollButton.dataset.courseId = course.id;

    const modal = new bootstrap.Modal(
        document.getElementById("courseModal")
    );
    modal.show();
}

function renderTutors() {
    const container =
        document.getElementById("tutors-container");

    container.innerHTML = "";

    filteredTutors.forEach(tutor => {
        const col = document.createElement("div");
        col.className = "col-md-6 mb-3";

        col.innerHTML = `
            <div class="card tutor-card h-100" data-id="${tutor.id}">
                <div class="card-body d-flex gap-3">
                    <img
                        src="https://cdn-icons-png.flaticon.com/512/4519/4519678.png"
                        class="tutor-photo rounded"
                        alt="Фото"
                    >
                    <div>
                        <h5 class="mb-1">${tutor.name}</h5>
                        <p class="mb-1">
                            Уровень: ${tutor.language_level}
                        </p>
                        <p class="mb-1">
                            Языки: ${tutor.languages_offered.join(", ")}
                        </p>
                        <p class="mb-1">
                            Опыт: ${tutor.work_experience} лет
                        </p>
                        <p class="fw-bold mb-0">
                            ${tutor.price_per_hour} ₽ / час
                        </p>
                    </div>
                </div>
            </div>
        `;

        col
            .querySelector(".tutor-card")
            .addEventListener("click", () =>
                toggleTutorSelection(tutor.id)
            );

        container.appendChild(col);
    });
}

function toggleTutorSelection(id) {
    const cards =
        document.querySelectorAll(".tutor-card");

    cards.forEach(card => {
        card.classList.remove("selected");
    });

    if (selectedTutorId === id) {
        selectedTutorId = null;
        document.getElementById("order-tutor-btn").disabled = true;
        return;
    }

    selectedTutorId = id;

    document
        .querySelector(`.tutor-card[data-id="${id}"]`)
        .classList.add("selected");

    document.getElementById("order-tutor-btn").disabled = false;
}

function openCourseOrderModal(course) {
    document.getElementById("order-course-name").value =
        course.name;

    document.getElementById("order-course-teacher").value =
        course.teacher;

    document.getElementById("order-duration-info").value =
        `${course.total_length} недель (${course.week_length} ч/нед)`;

    const dateSelect =
        document.getElementById("order-date-start");

    dateSelect.innerHTML =
        `<option value="">Выберите дату</option>`;

    const dates = [...new Set(
        course.start_dates.map(d => d.split("T")[0])
    )];

    dates.forEach(date => {
        dateSelect.innerHTML +=
            `<option value="${date}">${date}</option>`;
    });

    document.getElementById("order-time-start").innerHTML = "";
    document.getElementById("order-time-start").disabled = true;

    calculateCoursePrice();

    new bootstrap.Modal(
        document.getElementById("courseOrderModal")
    ).show();
}

//как я понял Опции заказа применяються только для курсов,
//для репетиторов нет такого
function calculateCoursePrice() {
    if (!selectedCourseForOrder) return;

    clearOrderNotifications();

    const persons =
        Number(document.getElementById("order-persons").value);

    const date =
        document.getElementById("order-date-start").value;

    const time =
        document.getElementById("order-time-start").value;

    const hours =
        selectedCourseForOrder.total_length *
        selectedCourseForOrder.week_length;

    let price =
        selectedCourseForOrder.course_fee_per_hour * hours;

    // ВЫХОДНЫЕ
    if (date) {
        const day = new Date(date).getDay();
        if (day === 0 || day === 6) {
            price *= 1.5;
            addOrderNotification(
                "Занятия в выходные: коэффициент 1.5"
            );
        }
    }

    // УТРО / ВЕЧЕР
    if (time >= "09:00" && time <= "12:00") {
        price += 400;
        addOrderNotification(
            "Утренние занятия (09:00–12:00): +400 ₽"
        );
    }

    if (time >= "18:00" && time <= "20:00") {
        price += 1000;
        addOrderNotification(
            "Вечерние занятия (18:00–20:00): +1000 ₽"
        );
    }

    // ИНТЕНСИВ
    if (selectedCourseForOrder.week_length >= 5) {
        price *= 1.2;
        addOrderNotification(
            "Интенсивный курс (≥ 5 ч/нед): +20%"
        );
    }

    // ДОП. МАТЕРИАЛЫ
    if (document.getElementById("supplementary").checked) {
        price += 2000;
        addOrderNotification(
            "Дополнительные учебные материалы: +2000 ₽"
        );
    }

    // ИНДИВИДУАЛЬНЫЕ
    if (document.getElementById("personalized").checked) {
        price += 1500 * selectedCourseForOrder.total_length;
        addOrderNotification(
            "Индивидуальные занятия: +1500 ₽ за неделю"
        );
    }

    // ЭКСКУРСИИ
    if (document.getElementById("excursions").checked) {
        price *= 1.25;
        addOrderNotification(
            "Культурные экскурсии: +25%"
        );
    }

    // ОЦЕНКА
    if (document.getElementById("assessment").checked) {
        price += 300;
        addOrderNotification(
            "Предварительная оценка уровня языка: +300 ₽"
        );
    }

    // ИНТЕРАКТИВ
    if (document.getElementById("interactive").checked) {
        price *= 1.5;
        addOrderNotification(
            "Интерактивная онлайн-платформа: +50%"
        );
    }

    // ГРУППОВАЯ СКИДКА
    if (persons >= 5) {
        price *= 0.85;
        addOrderNotification(
            "Групповая скидка (≥ 5 человек): −15%"
        );
    }

    // РАННЯЯ РЕГИСТРАЦИЯ
    if (date) {
        const start = new Date(date);
        const now = new Date();
        const diffDays =
            (start - now) / (1000 * 60 * 60 * 24);

        if (diffDays >= 30) {
            price *= 0.9;
            addOrderNotification(
                "Скидка за раннюю регистрацию (≥ 30 дней): −10%"
            );
        }
    }

    document.getElementById("order-total-price").textContent =
        Math.round(price * persons);
}

function fillTutorLanguages() {
    const select =
        document.getElementById("tutor-language");

    const languages = new Set();

    allTutors.forEach(tutor =>
        tutor.languages_offered.forEach(lang =>
            languages.add(lang)
        )
    );

    languages.forEach(lang => {
        const option = document.createElement("option");
        option.value = lang;
        option.textContent = lang;
        select.appendChild(option);
    });
}

function filterTutors() {
    const language =
        document.getElementById("tutor-language").value;

    const level =
        document.getElementById("tutor-level").value;

    filteredTutors = allTutors.filter(tutor => {
        const byLanguage = language
            ? tutor.languages_offered.includes(language)
            : true;

        const byLevel = level
            ? tutor.language_level === level
            : true;

        return byLanguage && byLevel;
    });

    selectedTutorId = null;
    document.getElementById("order-tutor-btn").disabled = true;

    renderTutors();
}

function openTutorOrderModal(tutor) {
    selectedTutor = tutor;

    document.getElementById("tutor-name").value =
        tutor.name;

    document.getElementById("tutor-price").value =
        `${tutor.price_per_hour} ₽ / час`;

    document.getElementById("tutor-duration").value = 1;
    document.getElementById("tutor-date").value = "";
    document.getElementById("tutor-email").value = "";
    document.getElementById("tutor-message").value = "";

    fillTutorTimes();
    calculateTutorPrice();

    new bootstrap.Modal(
        document.getElementById("tutorOrderModal")
    ).show();
}

function fillTutorTimes() {
    const select =
        document.getElementById("tutor-time");

    select.innerHTML = "";

    for (let h = 9; h <= 20; h++) {
        const time = `${String(h).padStart(2, "0")}:00`;
        select.innerHTML +=
            `<option value="${time}">${time}</option>`;
    }
}

function calculateTutorPrice() {
    if (!selectedTutor) return;

    let hours =
        Number(document.getElementById("tutor-duration").value);

    if (isNaN(hours) || hours < 1) hours = 1;
    if (hours > 40) hours = 40;

    document.getElementById("tutor-duration").value = hours;

    const price =
        hours * selectedTutor.price_per_hour;

    document.getElementById("tutor-total-price").textContent =
        price;
}

function clearOrderNotifications() {
    const box = document.getElementById("order-notifications");
    const list = document.getElementById("order-notification-list");

    list.innerHTML = "";
    box.style.display = "none";
}

function addOrderNotification(text) {
    const box = document.getElementById("order-notifications");
    const list = document.getElementById("order-notification-list");

    const li = document.createElement("li");
    li.textContent = text;

    list.appendChild(li);
    box.style.display = "block";
}

document
    .getElementById("submit-tutor-order")
    .addEventListener("click", async () => {

        const data = {
            tutor_id: selectedTutor.id,
            date_start:
                document.getElementById("tutor-date").value,
            time_start:
                document.getElementById("tutor-time").value,
            duration:
                Number(
                    document.getElementById("tutor-duration").value
                ),
            price:
                Number(
                    document.getElementById("tutor-total-price").textContent
                ),
            persons: 1
        };

        try {
            const response = await fetch(
                `${API_URL}orders?api_key=${API_KEY}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

            if (!response.ok) {
                throw new Error();
            }

            bootstrap
                .Modal
                .getInstance(
                    document.getElementById("tutorOrderModal")
                )
                .hide();

            document
                .getElementById("tutor-order-form")
                .reset();

            alert("Заявка отправлена!");

        } catch {
            alert("Ошибка отправки заявки");
        }
    });


document
    .getElementById("tutor-duration")
    .addEventListener("blur", e => {
        let value = Number(e.target.value);

        if (isNaN(value) || value < 1) value = 1;
        if (value > 40) value = 40;

        e.target.value = value;
        calculateTutorPrice();
    });

document
    .getElementById("order-tutor-btn")
    .addEventListener("click", () => {
        selectedTutor =
            allTutors.find(t => t.id === selectedTutorId);

        openTutorOrderModal(selectedTutor);
    });


document
    .getElementById("tutor-language")
    .addEventListener("change", filterTutors);

document
    .getElementById("tutor-level")
    .addEventListener("change", filterTutors);

document
    .querySelectorAll(
        "#course-order-form input, #course-order-form select"
    )
    .forEach(el =>
        el.addEventListener("change", calculateCoursePrice)
);
    
document
    .getElementById("submit-course-order")
    .addEventListener("click", async () => {
        const modalEl =
            document.getElementById("courseOrderModal");

        const modal =
            bootstrap.Modal.getInstance(modalEl);

        const data = {
            course_id: selectedCourseForOrder.id,
            tutor_id: 0,
            date_start:
                document.getElementById("order-date-start").value,
            time_start:
                document.getElementById("order-time-start").value,
            duration: selectedCourseForOrder.total_length,
            persons:
                Number(document.getElementById("order-persons").value),
            price:
                Number(
                    document.getElementById("order-total-price").textContent
                ),
            early_registration: false,
            group_enrollment:
                document.getElementById("order-persons").value >= 5,
            intensive_course:
                selectedCourseForOrder.week_length >= 5,
            supplementary:
                document.getElementById("supplementary").checked,
            personalized:
                document.getElementById("personalized").checked,
            excursions:
                document.getElementById("excursions").checked,
            assessment:
                document.getElementById("assessment").checked,
            interactive:
                document.getElementById("interactive").checked
        };

        try {
            const response = await fetch(
                `${API_URL}/orders?api_key=${API_KEY}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

            if (!response.ok) {
                throw new Error("Ошибка отправки заявки");
            }

            modal.hide();

            document
                .getElementById("course-order-form")
                .reset();

            clearOrderNotifications();
            selectedCourseForOrder = null;

            alert("Заявка успешно отправлена!");

        } catch (error) {
            alert(
                "Не удалось отправить заявку. Попробуйте позже."
            );
        }
    });


document
    .getElementById("order-date-start")
    .addEventListener("change", e => {
        const date = e.target.value;
        const timeSelect =
            document.getElementById("order-time-start");

        timeSelect.innerHTML = "";
        timeSelect.disabled = false;

        selectedCourseForOrder.start_dates
            .filter(d => d.startsWith(date))
            .forEach(d => {
                const time = d.split("T")[1].slice(0, 5);
                timeSelect.innerHTML +=
                    `<option value="${time}">${time}</option>`;
            });

        calculateCoursePrice();
    });

document
    .getElementById("courseEnrollButton")
    .addEventListener("click", () => {
        const courseId =
            document.getElementById("courseEnrollButton")
                .dataset.courseId;

        selectedCourseForOrder =
            allCourses.find(c => c.id === Number(courseId));

        openCourseOrderModal(selectedCourseForOrder);
    });

document
    .getElementById("course-search-form")
    .addEventListener("submit", e => {
        e.preventDefault();
        applyFilters();
    });

document
    .getElementById("reset-search")
    .addEventListener("click", resetFilters);

document
    .getElementById("order-persons")
    .addEventListener("blur", e => {
        let value = Number(e.target.value);

        if (isNaN(value) || value < 1) {
            value = 1;
        }
        
        if (value > 20) {
            value = 20;
        }

        e.target.value = value;

        calculateCoursePrice();
    });

fetchCourses();
fetchTutors();
// извените что не декопозировал код, хотелось по быстрее сделать, 
// хотя (даже смотря на название js файла) такая идея была