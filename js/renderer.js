const API_URL =
    "http://exam-api-courses.std-900.ist.mospolytech.ru/api/courses";
const API_KEY =
    "0c882bbd-5f5c-4a2b-848c-eb5fca826a2b";

const COURSES_PER_PAGE = 6;

let allCourses = [];
let visibleCourses = [];
let currentPage = 1;
let selectedCourseForOrder = null;


async function fetchCourses() {
    const response = await fetch(
        `${API_URL}?api_key=${API_KEY}`
    );

    allCourses = await response.json();
    visibleCourses = allCourses;

    render();
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
                `${API_URL.replace("/courses", "/orders")}?api_key=${API_KEY}`,
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

            /* закрываем модальное окно */
            modal.hide();

            /* сбрасываем форму */
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
// извените что не декопозировал код, хотелось по быстрее сделать, 
// хотя (даже смотря на название js файла) такая идея была