import { getOrCreateDeviceToken } from './crypto.js';
import { initDatabase, obtenerPresupuesto, obtenerGastos, añadirGasto, borrarGasto, editarGasto, login, guardarPresupuesto } from './api.js';

// IMPORTAMOS LAS NUEVAS UTILIDADES
import { getWeekId, formatearFechaUI, formatearDinero, getLimitesSemana } from './utils.js';
// Elemento raíz donde inyectaremos las pantallas
const appRoot = document.getElementById('app-root');

// ==========================================
// 0. ESTADO GLOBAL Y ORQUESTACIÓN (NUEVO)
// ==========================================
let APP_STATE = {
    usuario: null,
    urlApi: null,
    deviceToken: null,
    tema: 'normal',
    semanaSeleccionada: null, // { weekId, inicio, fin }
    viewDate: new Date()      // Fecha para navegar en el calendario
};

/**
 * El "Portero" de la aplicación. Gestiona la secuencia de arranque
 * de forma estrictamente asíncrona y disciplinada.
 */
async function bootstrapApp() {
    console.log("Iniciando secuencia de arranque de Konta v2...");

    // 1. Aplicar tema inmediatamente para evitar parpadeos (Flicker)
    APP_STATE.tema = localStorage.getItem('konta_theme') || 'normal';
    document.body.setAttribute('data-theme', APP_STATE.tema);

    // 2. Registro del Service Worker (PWA)
    if ('serviceWorker' in navigator) {
        try {
            // No bloqueamos el arranque si el SW falla
            await navigator.serviceWorker.register('./sw.js');
            console.log("Service Worker registrado con éxito.");
        } catch (err) {
            console.warn("Fallo al registrar SW:", err);
        }
    }

    // 3. Carga de configuración persistente
    APP_STATE.usuario = localStorage.getItem('konta_usuario');
    APP_STATE.urlApi = localStorage.getItem('konta_url_api');

    // 4. Resolución del Token Criptográfico (Bug #2 & #3 Fix)
    // Garantizamos que el token existe antes de cualquier petición a la red
    try {
        APP_STATE.deviceToken = await getOrCreateDeviceToken();
    } catch (error) {
        console.error("Error crítico de seguridad:", error);
        // ✅ LA SOLUCIÓN: Usamos tu propia función de enrutamiento
        renderView('tpl-error-seguridad');
        return;
    }

    // 5. Enrutamiento Lógico (Basado en el README)
    if (!APP_STATE.usuario || !APP_STATE.urlApi) {
        console.log("Datos insuficientes. Dirigiendo a Inicio.");
        renderView('tpl-pantalla-inicio');
    } else {
        console.log("Sesión activa detectada. Cargando Dashboard...");
        renderView('tpl-dashboard');
    }
}

// ==========================================
// 1. SISTEMA DE ENRUTAMIENTO
// ==========================================
function renderView(templateId) {
    appRoot.innerHTML = '';
    const template = document.getElementById(templateId);
    if (!template) {
        console.error(`Error: Plantilla ${templateId} no encontrada.`);
        return;
    }

    const clone = template.content.cloneNode(true);
    appRoot.appendChild(clone);

    // Inicializamos la lógica según la vista
    switch (templateId) {
        case 'tpl-pantalla-inicio': setupPantallaInicio(); break;
        case 'tpl-pantalla-configuracion': setupPantallaConfiguracion(); break;
        case 'tpl-dashboard': setupDashboard(); break;
        case 'tpl-add-registro': setupAddRegistro(); break;
        case 'tpl-scanner': setupScanner(); break;
    }
}

// ==========================================
// 2. LÓGICA DE PANTALLAS (INICIO / CONFIG)
// ==========================================

function setupPantallaInicio() {
    const btnContrast = document.getElementById('btn-toggle-contrast');
    const iconContrast = document.getElementById('icon-contrast');
    const linkIrCrear = document.getElementById('link-ir-crear');
    const btnIniciarSesion = document.getElementById('btn-iniciar-sesion');

    actualizarIconoContraste(iconContrast);

    btnContrast.addEventListener('click', () => {
        toggleAltoContraste();
        actualizarIconoContraste(iconContrast);
    });

    linkIrCrear.addEventListener('click', () => renderView('tpl-pantalla-configuracion'));

    const btnScan = document.getElementById('btn-scan-qr');
    if (btnScan) btnScan.addEventListener('click', () => renderView('tpl-scanner'));

    btnIniciarSesion.addEventListener('click', async () => {
        const usuario = document.getElementById('input-usuario').value.trim();
        const urlApi = document.getElementById('input-url-api').value.trim();

        if (!usuario || !urlApi) {
            alert('Por favor, rellena todos los campos.');
            return;
        }

        const originalHTML = btnIniciarSesion.innerHTML;
        btnIniciarSesion.innerHTML = `<span class="btn-text-fill">Iniciando...</span>`;
        btnIniciarSesion.disabled = true;

        try {
            // Login con el token que ya bootstrapApp garantizó que existe
            await login(urlApi, usuario, APP_STATE.deviceToken);

            localStorage.setItem('konta_usuario', usuario);
            localStorage.setItem('konta_url_api', urlApi);
            
            // Actualizamos estado y navegamos
            APP_STATE.usuario = usuario;
            APP_STATE.urlApi = urlApi;
            renderView('tpl-dashboard');
        } catch (error) {
            alert(error.message);
        } finally {
            btnIniciarSesion.innerHTML = originalHTML;
            btnIniciarSesion.disabled = false;
        }
    });
}

function setupPantallaConfiguracion() {
    const btnContrast = document.getElementById('btn-toggle-contrast-config');
    const iconContrast = document.getElementById('icon-contrast-config');
    const linkIrInicio = document.getElementById('link-ir-inicio');
    const btnCrear = document.getElementById('btn-crear-db');

    actualizarIconoContraste(iconContrast);

    btnContrast.addEventListener('click', () => {
        toggleAltoContraste();
        actualizarIconoContraste(iconContrast);
    });

    linkIrInicio.addEventListener('click', () => renderView('tpl-pantalla-inicio'));

    btnCrear.addEventListener('click', async () => {
        const usuario = document.getElementById('input-usuario-config').value.trim();
        const urlSchema = document.getElementById('input-url-schema').value.trim();
        const urlApi = document.getElementById('input-url-api-config').value.trim();
        const nombresExtra = document.getElementById('input-otros-usuarios').value.trim();
        const presupuestoStr = document.getElementById('input-presupuesto-base').value.trim();

        if (!usuario || !urlSchema || !urlApi || !presupuestoStr) {
            alert('Faltan datos por rellenar.');
            return;
        }

        const presupuestoInicial = parseFloat(presupuestoStr);
        if (isNaN(presupuestoInicial) || presupuestoInicial <= 0) {
            alert('El presupuesto debe ser un número mayor que 0.');
            return;
        }

        const usuariosFamilia = [usuario, ...nombresExtra.split(',').map(u => u.trim()).filter(Boolean)];

        const originalHTML = btnCrear.innerHTML;
        btnCrear.innerHTML = `<span class="btn-text-fill">Configurando DB...</span>`;
        btnCrear.disabled = true;

        try {
            await initDatabase(urlSchema, usuariosFamilia, presupuestoInicial);
            await login(urlApi, usuario, APP_STATE.deviceToken);

            localStorage.setItem('konta_usuario', usuario);
            localStorage.setItem('konta_url_api', urlApi);
            APP_STATE.usuario = usuario;
            APP_STATE.urlApi = urlApi;

            alert("¡Base de datos creada con éxito! 🎉");
            renderView('tpl-dashboard');
        } catch (error) {
            alert("Error al crear la DB: " + error.message);
        } finally {
            btnCrear.innerHTML = originalHTML;
            btnCrear.disabled = false;
        }
    });
}

// ==========================================
// 3. LÓGICA DEL DASHBOARD
// ==========================================
async function setupDashboard() {
    const usuario = APP_STATE.usuario || 'Usuario';
    const urlApi = APP_STATE.urlApi;
    const deviceToken = APP_STATE.deviceToken;

    document.getElementById('dash-saludo').innerText = `Hola ${usuario}`;

    // Lógica de semana actual vs seleccionada
    const hoy = Date.now();
    const semanaHoy = { 
        weekId: getWeekId(hoy), 
        ...getLimitesSemana(hoy) 
    };

    // Si no hay semana seleccionada, usamos la de hoy
    if (!APP_STATE.semanaSeleccionada) {
        APP_STATE.semanaSeleccionada = semanaHoy;
    }

    const isCurrentWeek = APP_STATE.semanaSeleccionada.weekId === semanaHoy.weekId;
    const { weekId, inicio, fin } = APP_STATE.semanaSeleccionada;

    const dineroActualEl = document.getElementById('dash-dinero-actual');
    const dineroMaxEl = document.getElementById('dash-dinero-max');
    const listaGastosEl = document.getElementById('lista-gastos');

    listaGastosEl.innerHTML = '';

    const overlay = document.getElementById('main-overlay');
    const sidebar = document.getElementById('sidebar-menu');
    const btnOpenMenu = document.getElementById('btn-open-menu');
    const fabAdd = document.getElementById('btn-ir-add-registro');

    // Muestra/Oculta FAB según si es la semana actual (Readme req)
    fabAdd.style.display = isCurrentWeek ? 'flex' : 'none';
    fabAdd.onclick = () => renderView('tpl-add-registro');

    btnOpenMenu.addEventListener('click', () => {
        overlay.classList.add('active');
        sidebar.style.display = 'flex';
        renderSidebarCalendario(); // Render cada vez que se abre
    });

    function cerrarOverlay() {
        overlay.classList.remove('active');
        setTimeout(() => {
            if (sidebar) sidebar.style.display = 'none';
            if (modalVerRegistro) modalVerRegistro.style.display = 'none';
            if (modalQr) modalQr.style.display = 'none';
        }, 300);
    }

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cerrarOverlay();
    });

    // SIDEBAR
    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    const btnCompartirQr = document.getElementById('btn-compartir-qr');

    btnCerrarSesion.addEventListener('click', () => {
        if (confirm("¿Seguro que quieres cerrar sesión?")) {
            localStorage.removeItem('konta_usuario');
            localStorage.removeItem('konta_url_api');
            APP_STATE.usuario = null;
            APP_STATE.urlApi = null;
            overlay.classList.remove('active');
            setTimeout(() => renderView('tpl-pantalla-inicio'), 300);
        }
    });

    const modalQr = document.getElementById('modal-qr');
    const qrContainer = document.getElementById('qr-container');
    const btnCloseQr = document.getElementById('btn-close-qr');

    btnCompartirQr.addEventListener('click', () => {
        qrContainer.innerHTML = '';
        const qrCanvas = document.createElement('canvas');
        qrContainer.appendChild(qrCanvas);

        QRCode.toCanvas(qrCanvas, urlApi, { width: 280, margin: 2 }, (err) => {
            if (err) console.error(err);
            sidebar.style.display = 'none';
            modalQr.style.display = 'flex';
        });
    });

    btnCloseQr.addEventListener('click', () => cerrarOverlay());

    const modalVerRegistro = document.getElementById('modal-ver-registro');
    const modalHandle = document.getElementById('modal-handle');
    
    // Lógica de cierre por swipe (tactil)
    let startY = 0;
    modalVerRegistro.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    });
    modalVerRegistro.addEventListener('touchmove', (e) => {
        const deltaY = e.touches[0].clientY - startY;
        if (deltaY > 0) {
            modalVerRegistro.style.transform = `translateY(${deltaY}px)`;
        }
    });
    modalVerRegistro.addEventListener('touchend', (e) => {
        const deltaY = e.changedTouches[0].clientY - startY;
        if (deltaY > 100) {
            cerrarOverlay();
        }
        modalVerRegistro.style.transform = '';
    });
    const btnModalEditar = document.getElementById('btn-modal-editar');
    const btnModalBorrar = document.getElementById('btn-modal-borrar');
    let gastoSeleccionado = null;

    function abrirModalRegistro(gasto) {
        gastoSeleccionado = gasto;
        document.getElementById('modal-concepto').textContent = gasto.concepto;
        document.getElementById('modal-precio').textContent = formatearDinero(gasto.precio);
        document.getElementById('modal-autor').textContent = `Hecho por ${gasto.username}`;
        document.getElementById('modal-fecha').textContent = new Date(gasto.timestamp).toLocaleString('es-ES');
        document.getElementById('modal-desc').textContent = gasto.descripcion || "Sin descripción";
        modalVerRegistro.style.display = 'flex';
        overlay.classList.add('active');
    }

    btnModalBorrar.addEventListener('click', async () => {
        if (!confirm("¿Borrar definitivamente?")) return;
        try {
            await borrarGasto(urlApi, gastoSeleccionado.id, deviceToken);
            cerrarOverlay();
            renderView('tpl-dashboard');
        } catch (error) { alert(error.message); }
    });

    btnModalEditar.addEventListener('click', async () => {
        const nuevoConcepto = prompt('Concepto:', gastoSeleccionado.concepto);
        const nuevoPrecio = parseFloat(prompt('Precio:', gastoSeleccionado.precio));
        if (!nuevoConcepto || isNaN(nuevoPrecio)) return;

        try {
            await editarGasto(urlApi, gastoSeleccionado.id, {
                concepto: nuevoConcepto,
                precio: nuevoPrecio,
                timestamp: gastoSeleccionado.timestamp
            }, deviceToken);
            cerrarOverlay();
            renderView('tpl-dashboard');
        } catch (error) { alert(error.message); }
    });

    // CARGA DE DATOS
    try {
        const presupuestoMax = await obtenerPresupuesto(urlApi, weekId, deviceToken);
        dineroMaxEl.innerText = `/${presupuestoMax}`;

        const gastos = await obtenerGastos(urlApi, inicio, fin, deviceToken);
        const totalGastado = gastos.reduce((sum, g) => sum + g.precio, 0);
        const dineroRestante = presupuestoMax - totalGastado;
        
        dineroActualEl.innerText = formatearDinero(dineroRestante).replace('€', '').trim();
        if (dineroRestante < 0) dineroActualEl.style.color = '#FF4D4D';

        pintarListaGastos(gastos, listaGastosEl, abrirModalRegistro);

        document.getElementById('btn-edit-presupuesto').addEventListener('click', async () => {
            const nuevo = prompt("Nuevo presupuesto:", presupuestoMax);
            if (nuevo && !isNaN(nuevo)) {
                await guardarPresupuesto(urlApi, weekId, nuevo, deviceToken);
                renderView('tpl-dashboard');
            }
        });

        // LÓGICA DE VIAJE EN EL TIEMPO: Ocultar botón flotante si vemos el pasado
        const botonFlotante = document.querySelector('.fab-button');
        const idSemanaRealActual = getWeekId(Date.now());
        
        if (botonFlotante && APP_STATE.semanaSeleccionada) {
            if (APP_STATE.semanaSeleccionada.weekId !== idSemanaRealActual) {
                // Es una semana pasada, escondemos el botón
                botonFlotante.style.display = 'none';
            } else {
                // Es la semana actual, mostramos el botón
                botonFlotante.style.display = 'flex';
            }
        }
    } catch (error) {
        console.error("Dashboard error:", error);
    }
}

function pintarListaGastos(gastos, contenedor, abrirModal) {
    if (gastos.length === 0) {
        contenedor.innerHTML = '<p class="p-base" style="text-align:center; width:100%;">No hay gastos.</p>';
        return;
    }
    const grupos = {};
    gastos.forEach(g => {
        const dia = formatearFechaUI(g.timestamp);
        if (!grupos[dia]) grupos[dia] = [];
        grupos[dia].push(g);
    });

    for (const [dia, lista] of Object.entries(grupos)) {
        const bloque = document.createElement('div');
        bloque.className = 'dia-bloque';
        bloque.innerHTML = `<h3 class="h3 btn-text-white">${dia}</h3>`;
        lista.forEach(g => {
            const btn = document.createElement('button');
            btn.className = 'btn-cuadrado btn-gasto';
            btn.innerHTML = `<span class="p-base concepto">${g.concepto}</span><span class="p-base precio">${formatearDinero(g.precio)}</span>`;
            btn.onclick = () => abrirModal(g);
            bloque.appendChild(btn);
        });
        contenedor.appendChild(bloque);
    }
}

// ==========================================
// 4. AÑADIR REGISTRO
// ==========================================
function setupAddRegistro() {
    document.getElementById('btn-back-dashboard').onclick = () => renderView('tpl-dashboard');
    document.getElementById('btn-submit-registro').onclick = async () => {
        const concepto = document.getElementById('input-concepto').value.trim();
        const descripcion = document.getElementById('input-descripcion').value.trim();
        const precio = document.getElementById('input-precio').value.trim();
        
        if (!concepto || !precio) {
            alert('El concepto y el precio son obligatorios.');
            return;
        }

        try {
            await añadirGasto(APP_STATE.urlApi, {
                concepto,
                descripcion,
                precio,
                timestamp: Date.now()
            }, APP_STATE.deviceToken);
            renderView('tpl-dashboard');
        } catch (error) { alert(error.message); }
    };
}

// ==========================================
// 5. UTILIDADES GLOBALES
// ==========================================
function toggleAltoContraste() {
    APP_STATE.tema = APP_STATE.tema === 'normal' ? 'high-contrast' : 'normal';
    document.body.setAttribute('data-theme', APP_STATE.tema);
    localStorage.setItem('konta_theme', APP_STATE.tema);
}

function actualizarIconoContraste(icon) {
    icon.src = APP_STATE.tema === 'high-contrast' ? './assets/svg/Select.svg' : './assets/svg/Not-Select.svg';
}

// ==========================================
// 6. LÓGICA DEL CALENDARIO (SIDEBAR)
// ==========================================

function renderSidebarCalendario() {
    const contenedor = document.querySelector('.sidebar-calendario');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const date = APP_STATE.viewDate;
    const year = date.getFullYear();
    const month = date.getMonth();

    // Header del mes con flechas
    const monthHeader = document.createElement('div');
    monthHeader.style.display = 'flex';
    monthHeader.style.justifyContent = 'space-between';
    monthHeader.style.alignItems = 'center';
    monthHeader.style.marginBottom = '16px';

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthHeader.innerHTML = `
        <button class="icon-button" id="prev-month"><img src="./assets/svg/Chevron-izq.svg" style="width:24px;"></button>
        <h3 class="h3" style="color:var(--negro-suave);">${monthNames[month]} ${year}</h3>
        <button class="icon-button" id="next-month"><img src="./assets/svg/Chevron-der.svg" style="width:24px;"></button>
    `;
    contenedor.appendChild(monthHeader);

    document.getElementById('prev-month').onclick = () => {
        APP_STATE.viewDate.setMonth(APP_STATE.viewDate.getMonth() - 1);
        renderSidebarCalendario();
    };
    document.getElementById('next-month').onclick = () => {
        APP_STATE.viewDate.setMonth(APP_STATE.viewDate.getMonth() + 1);
        renderSidebarCalendario();
    };

    // Grid de días agrupado por semanas
    const calendarBody = document.createElement('div');
    calendarBody.style.display = 'flex';
    calendarBody.style.flexDirection = 'column';
    calendarBody.style.gap = '4px';

    // Headers de días (siempre en la parte superior)
    const headers = document.createElement('div');
    headers.style.display = 'grid';
    headers.style.gridTemplateColumns = 'repeat(7, 1fr)';
    headers.style.width = '100%';
    ["L", "M", "X", "J", "V", "S", "D"].forEach(d => {
        const h = document.createElement('div');
        h.className = 'calendar-day-header';
        h.textContent = d;
        headers.appendChild(h);
    });
    calendarBody.appendChild(headers);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDayIdx = (firstDay.getDay() + 6) % 7;

    // Generar todos los días a mostrar (incluyendo previos y posteriores para completar semanas)
    let daysToRender = [];
    
    // Mes anterior
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIdx - 1; i >= 0; i--) {
        daysToRender.push({ day: prevLastDay - i, month: 'prev', timestamp: new Date(year, month - 1, prevLastDay - i).getTime() });
    }

    // Mes actual
    for (let d = 1; d <= lastDay.getDate(); d++) {
        daysToRender.push({ day: d, month: 'current', timestamp: new Date(year, month, d).getTime() });
    }

    // Mes siguiente (para completar la última semana)
    let remaining = 7 - (daysToRender.length % 7);
    if (remaining < 7) {
        for (let i = 1; i <= remaining; i++) {
            daysToRender.push({ day: i, month: 'next', timestamp: new Date(year, month + 1, i).getTime() });
        }
    }

    // Agrupar en semanas de 7
    const hoyTimestamp = new Date();
    hoyTimestamp.setHours(0,0,0,0);
    const hoyMs = hoyTimestamp.getTime();

    for (let i = 0; i < daysToRender.length; i += 7) {
        const semana = daysToRender.slice(i, i + 7);
        const firstDayOfWeek = semana[0].timestamp;
        const weekId = getWeekId(firstDayOfWeek);
        const isSelected = APP_STATE.semanaSeleccionada && APP_STATE.semanaSeleccionada.weekId === weekId;

        const weekRow = document.createElement('div');
        weekRow.className = `week-selection-row ${isSelected ? 'active-week' : ''}`;
        
        semana.forEach(d => {
            const cell = document.createElement('div');
            cell.className = `calendar-day-cell ${d.month !== 'current' ? 'not-current-month' : ''}`;
            
            // Ya no mostramos el círculo de hoy por petición del usuario
            cell.textContent = d.day;

            cell.onclick = () => {
                const limits = getLimitesSemana(d.timestamp);
                APP_STATE.semanaSeleccionada = {
                    weekId: getWeekId(d.timestamp),
                    inicio: limits.inicio,
                    fin: limits.fin
                };
                const overlay = document.getElementById('main-overlay');
                if (overlay) overlay.classList.remove('active');
                setupDashboard();
            };
            weekRow.appendChild(cell);
        });
        calendarBody.appendChild(weekRow);
    }

    contenedor.appendChild(calendarBody);
}

function setupScanner() {
    document.getElementById('btn-cancel-scan').onclick = () => renderView('tpl-pantalla-inicio');
    const scanner = new Html5Qrcode("reader");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => {
        scanner.stop().then(() => {
            renderView('tpl-pantalla-inicio');
            setTimeout(() => document.getElementById('input-url-api').value = text, 50);
        });
    });
}

// ARRANCAMOS EL MOTOR
bootstrapApp();