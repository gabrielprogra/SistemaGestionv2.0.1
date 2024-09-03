// Variables globales
let inventario = [];
let carrito = [];
let ventas = [];
let comprobantes = [];
let fuse; // Para la búsqueda difusa
let currentPage = 1;
const itemsPerPage = 11;

// Credenciales (en una aplicación real, esto estaría en el servidor)
const validUsername = "ValleGrande551";
const validPassword = "Tp59#Qr24FA";

// Función para verificar las credenciales
function authenticate() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === validUsername && password === validPassword) {
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
        initializeApp();
    } else {
        alert("Usuario o contraseña incorrectos");
    }
}

// Función para inicializar la aplicación
function initializeApp() {
    // Mostrar la sección de ventas por defecto
    const ventasSection = document.querySelector('#ventas');
    if (ventasSection) {
        ventasSection.classList.add('active');
    }
    
    // Establecer la fecha de hoy como valor predeterminado para los campos de fecha
    const today = new Date().toISOString().split('T')[0];
    const fechaDesdeInput = document.getElementById('fechaDesde');
    const fechaHastaInput = document.getElementById('fechaHasta');
    if (fechaDesdeInput) fechaDesdeInput.value = today;
    if (fechaHastaInput) fechaHastaInput.value = today;

    // Configurar el evento de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 1; // Resetear a la primera página en cada nueva búsqueda
            buscarProductos();
        }, 300));
    }

    // Configurar el evento de búsqueda para comprobantes
    const searchComprobantes = document.getElementById('searchComprobantes');
    if (searchComprobantes) {
        searchComprobantes.addEventListener('input', debounce(() => {
            buscarComprobantes();
        }, 300));
    }

    // Cargar datos desde localStorage
    cargarInventarioDeLocalStorage();
    cargarCarritoDeLocalStorage();
    cargarVentasDeLocalStorage();
    cargarComprobantesDeLocalStorage();

    // Iniciar la actualización de la hora
    updateTime();
}

// Funciones de utilidad
function formatPrice(price) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
}

function parsePrice(priceString) {
    if (typeof priceString === 'number') return priceString;
    return parseFloat(priceString.replace(/[^\d.-]/g, ''));
}

function parsePercentage(percentString) {
    if (typeof percentString === 'number') return percentString;
    return parseFloat(percentString.replace('%', '')) / 100;
}

// Función para inicializar Fuse.js (búsqueda difusa)
function initializeFuse() {
    const options = {
        keys: ['codigo', 'producto', 'marca', 'rubro'],
        threshold: 0.3,
        ignoreLocation: false,
        location: 0,
        distance: 100,
        minMatchCharLength: 1,
        shouldSort: true,
        sortFn: (a, b) => {
            if (a.score === b.score) {
                const aIndex = a.ranges && a.ranges[0] ? a.ranges[0][0] : 0;
                const bIndex = b.ranges && b.ranges[0] ? b.ranges[0][0] : 0;
                return aIndex - bIndex;
            }
            return a.score - b.score;
        }
    };
    fuse = new Fuse(inventario, options);
}

// Función para actualizar la hora
function updateTime() {
    const now = new Date();
    const options = { 
        timeZone: 'America/Argentina/Buenos_Aires',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('current-time').textContent = now.toLocaleTimeString('es-AR', options);
}

// Actualizar la hora cada segundo
setInterval(updateTime, 1000);

// Navegación
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector('section.active').classList.remove('active');
        document.querySelector(this.getAttribute('href')).classList.add('active');
        document.querySelector('nav a.active').classList.remove('active');
        this.classList.add('active');
    });
});

// Búsqueda de productos
function buscarProductos() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm.length < 1) {
        document.getElementById('searchSuggestions').innerHTML = '';
        document.getElementById('searchSuggestions').classList.remove('active');
        mostrarResultados([]);
        return;
    }

    const resultados = fuse.search(searchTerm);
    
    // Filtrar resultados más relevantes
    const resultadosFiltrados = resultados.filter(result => {
        const lowerProduct = result.item.producto.toLowerCase();
        return lowerProduct.startsWith(searchTerm) || 
               lowerProduct.includes(' ' + searchTerm) ||
               result.item.codigo.toString().startsWith(searchTerm);
    });

    mostrarSugerencias(resultadosFiltrados.slice(0, 5)); // Muestra las primeras 5 sugerencias filtradas
    mostrarResultados(resultadosFiltrados.map(r => r.item));
}

// Función para mostrar sugerencias
function mostrarSugerencias(sugerencias) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    suggestionsContainer.innerHTML = '';

    if (sugerencias.length > 0) {
        suggestionsContainer.classList.add('active');
    } else {
        suggestionsContainer.classList.remove('active');
    }

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    sugerencias.forEach(sugerencia => {
        const div = document.createElement('div');
        const producto = sugerencia.item.producto;
        const index = producto.toLowerCase().indexOf(searchTerm);
        if (index >= 0) {
            div.innerHTML = producto.substring(0, index) +
                            '<strong>' + producto.substring(index, index + searchTerm.length) + '</strong>' +
                            producto.substring(index + searchTerm.length);
        } else {
            div.textContent = producto;
        }
        div.addEventListener('click', () => {
            document.getElementById('searchInput').value = producto;
            buscarProductos();
            suggestionsContainer.classList.remove('active');
        });
        suggestionsContainer.appendChild(div);
    });
}

function mostrarResultados(resultados) {
    const totalProductos = resultados.length;
    const totalPages = Math.ceil(totalProductos / itemsPerPage);
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = resultados.slice(startIndex, endIndex);

    const tbody = document.querySelector('#resultadosBusqueda tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    paginatedResults.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.producto}</td>
            <td>${item.marca}</td>
            <td>${item.rubro}</td>
            <td>${formatPrice(item.precioVenta)}</td>
            <td><input type="number" min="0" step="0.01" value="1" class="cantidadInput"></td>
            <td><button class="agregarCarrito"><i class="fas fa-cart-plus"></i></button></td>
        `;
        const cantidadInput = tr.querySelector('.cantidadInput');
        const agregarButton = tr.querySelector('.agregarCarrito');
        
        if (cantidadInput && agregarButton) {
            agregarButton.addEventListener('click', function() {
                const cantidad = parseFloat(cantidadInput.value);
                agregarAlCarrito(item, cantidad);
                cantidadInput.value = "1"; // Resetear la cantidad a 1
                mostrarModal("Producto agregado correctamente", 500);
            });
        }
        tbody.appendChild(tr);
    });

    actualizarPaginacion(totalProductos, totalPages);
}

function actualizarPaginacion(totalProductos, totalPages) {
    const paginationButtons = document.getElementById('paginationButtons');
    const totalProductosSpan = document.getElementById('totalProductos');

    totalProductosSpan.textContent = `${totalProductos} productos`;

    paginationButtons.innerHTML = '';

    // Botón "Primera página"
    const firstPageButton = document.createElement('button');
    firstPageButton.innerHTML = '<i class="fas fa-angle-double-left"></i>';
    firstPageButton.addEventListener('click', () => cambiarPagina(1));
    firstPageButton.disabled = currentPage === 1;
    paginationButtons.appendChild(firstPageButton);

    // Botón "Página anterior"
    const prevPageButton = document.createElement('button');
    prevPageButton.innerHTML = '<i class="fas fa-angle-left"></i>';
    prevPageButton.addEventListener('click', () => cambiarPagina(currentPage - 1));
    prevPageButton.disabled = currentPage === 1;
    paginationButtons.appendChild(prevPageButton);

    // Botones de páginas
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => cambiarPagina(i));
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        paginationButtons.appendChild(pageButton);
    }

    // Botón "Página siguiente"
    const nextPageButton = document.createElement('button');
    nextPageButton.innerHTML = '<i class="fas fa-angle-right"></i>';
    nextPageButton.addEventListener('click', () => cambiarPagina(currentPage + 1));
    nextPageButton.disabled = currentPage === totalPages;
    paginationButtons.appendChild(nextPageButton);

    // Botón "Última página"
    const lastPageButton = document.createElement('button');
    lastPageButton.innerHTML = '<i class="fas fa-angle-double-right"></i>';
    lastPageButton.addEventListener('click', () => cambiarPagina(totalPages));
    lastPageButton.disabled = currentPage === totalPages;
    paginationButtons.appendChild(lastPageButton);
}

function cambiarPagina(newPage) {
    currentPage = newPage;
    buscarProductos();
}

// Carrito de compras
function agregarAlCarrito(item, cantidad) {
    const itemEnCarrito = carrito.find(i => i.codigo === item.codigo);
    if (itemEnCarrito) {
        itemEnCarrito.cantidad += cantidad;
    } else {
        carrito.push({...item, cantidad, descuento: 0});
    }
    actualizarCarrito();
    guardarCarritoEnLocalStorage();
}

function actualizarCarrito() {
    const tbody = document.querySelector('#carritoTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    let subtotal = 0;
    carrito.forEach(item => {
        const subtotalItem = item.precioVenta * item.cantidad * (1 - item.descuento / 100);
        subtotal += subtotalItem;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.producto}</td>
            <td>${formatPrice(item.precioVenta)}</td>
            <td><input type="number" min="0" step="0.01" value="${item.cantidad}" class="cantidadInput"></td>
            <td><input type="number" min="0" max="100" value="${item.descuento}" class="descuentoInput"></td>
            <td>${formatPrice(subtotalItem)}</td>
            <td><button class="eliminarDelCarrito">Eliminar</button></td>
        `;
        
        const cantidadInput = tr.querySelector('.cantidadInput');
        const descuentoInput = tr.querySelector('.descuentoInput');
        const eliminarButton = tr.querySelector('.eliminarDelCarrito');
        
        if (cantidadInput) {
            cantidadInput.addEventListener('change', function() {
                item.cantidad = parseFloat(this.value);
                actualizarCarrito();
            });
        }
        
        if (descuentoInput) {
            descuentoInput.addEventListener('change', function() {
                item.descuento = parseFloat(this.value);
                actualizarCarrito();
            });
        }
        
        if (eliminarButton) {
            eliminarButton.addEventListener('click', function() {
                carrito = carrito.filter(i => i.codigo !== item.codigo);
                actualizarCarrito();
            });
        }
        
        tbody.appendChild(tr);
    });
    
    const subtotalElement = document.getElementById('subtotalCarrito');
    const descuentoGlobalInput = document.getElementById('descuentoGlobal');
    const totalNetoElement = document.getElementById('totalNetoCarrito');

    if (subtotalElement && descuentoGlobalInput && totalNetoElement) {
        subtotalElement.textContent = formatPrice(subtotal);
        
        const descuentoGlobal = parseFloat(descuentoGlobalInput.value) / 100;
        const totalNeto = subtotal * (1 - descuentoGlobal);
        
        totalNetoElement.textContent = formatPrice(totalNeto);

        descuentoGlobalInput.addEventListener('change', actualizarCarrito);
    }
}

document.getElementById('confirmarCompra').addEventListener('click', function() {
    if (carrito.length === 0) {
        mostrarModal('El carrito está vacío');
        return;
    }
    
    const confirmModal = document.getElementById('confirmModal');
    confirmModal.classList.add('show');
});

document.getElementById('confirmCompraFinal').addEventListener('click', function() {
    const clientName = document.getElementById('clientName').value.toUpperCase() || 'N/A';
    const clientAddress = document.getElementById('clientAddress').value.toUpperCase() || 'N/A';
    const clientState = document.getElementById('clientState').value || 'N/A';
 // ... (continuación del JavaScript anterior) ...

    const clientComment = document.getElementById('clientComment').value.toUpperCase() || 'N/A';
    
    const fecha = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const descuentoGlobal = parseFloat(document.getElementById('descuentoGlobal').value) / 100;
    const subtotal = carrito.reduce((sum, item) => sum + item.precioVenta * item.cantidad * (1 - item.descuento / 100), 0);
    const totalNeto = subtotal * (1 - descuentoGlobal);
    
    const codigoComprobante = generarCodigoComprobante();
    
    const nuevoComprobante = {
        codigo: codigoComprobante,
        cliente: clientName,
        fecha: fecha,
        estado: clientState,
        subtotal: subtotal,
        descuentoGlobal: descuentoGlobal,
        totalNeto: totalNeto,
        items: carrito.map(item => ({
            ...item,
            subtotal: item.precioVenta * item.cantidad * (1 - item.descuento / 100)
        })),
        direccion: clientAddress,
        comentario: clientComment
    };
    
    comprobantes.push(nuevoComprobante);
    guardarComprobantesEnLocalStorage();
    
    carrito.forEach(item => {
        ventas.push({
            fecha,
            codigo: item.codigo,
            producto: item.producto,
            cantidad: item.cantidad,
            precioVenta: item.precioVenta,
            descuento: item.descuento,
            descuentoGlobal,
            total: item.precioVenta * item.cantidad * (1 - item.descuento / 100) * (1 - descuentoGlobal),
            marca: item.marca,
            rubro: item.rubro
        });
    });
    
    generarComprobantePDF(nuevoComprobante);
    
    carrito = [];
    actualizarCarrito();
    guardarCarritoEnLocalStorage();
    guardarVentasEnLocalStorage();
    mostrarModal('Compra confirmada');
    mostrarVentas(ventas);
    mostrarComprobantes();
    
    document.getElementById('confirmModal').classList.remove('show');
});

document.getElementById('cancelCompra').addEventListener('click', function() {
    document.getElementById('confirmModal').classList.remove('show');
});

// Generar código alfanumérico para comprobantes
function generarCodigoComprobante() {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let codigo;
    do {
        codigo = '';
        for (let i = 0; i < 2; i++) {
            codigo += letras.charAt(Math.floor(Math.random() * letras.length));
        }
        for (let i = 0; i < 2; i++) {
            codigo += Math.floor(Math.random() * 10);
        }
    } while (comprobantes.some(c => c.codigo === codigo));
    return codigo;
}

// Generar Comprobante PDF
function generarComprobantePDF(comprobante) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Título principal
    doc.setFontSize(22);
    doc.text('Ferretería Valle Grande', 105, 15, null, null, 'center');
    
    doc.setFontSize(18);
    doc.text('Comprobante', 105, 25, null, null, 'center');
    
    doc.setFontSize(12);
    doc.text(`Fecha: ${comprobante.fecha}`, 14, 35);
    doc.text(`Código: ${comprobante.codigo}`, 14, 42);

    // Ajuste de la dirección para que no sobrepase el margen
    const splitAddress = doc.splitTextToSize(comprobante.direccion, 180);
    doc.text(`Dirección: ${splitAddress.join(' ')}`, 14, 49);

    doc.text(`Cliente: ${comprobante.cliente}`, 14, 56);
    doc.text(`Estado: ${comprobante.estado}`, 14, 63);
    
    const columns = ['Código', 'Producto', 'Cant.', 'Precio', 'Desc.', 'Total'];
    const data = comprobante.items.map(item => {
        return [
            item.codigo,
            item.producto,
            item.cantidad,
            formatPrice(item.precioVenta),
            `${item.descuento}%`,
            formatPrice(item.subtotal)
        ];
    });
    
    data.push(['', '', '', '', 'Subtotal:', formatPrice(comprobante.subtotal)]);
    data.push(['', '', '', '', `Desc. Global: ${comprobante.descuentoGlobal * 100}%`, '']);
    data.push(['', '', '', '', 'Total Neto:', formatPrice(comprobante.totalNeto)]);
    
    doc.autoTable({
        head: [columns],
        body: data,
        startY: 70,
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20 },
            3: { cellWidth: 30 },
            4: { cellWidth: 20 },
            5: { cellWidth: 30 }
        },
        didDrawPage: function (data) {
            // Pié de página
            doc.setFontSize(8);
            doc.text('Página ' + data.pageCount, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });
    
    const finalY = doc.lastAutoTable.finalY || 70;
    
    doc.setFontSize(10);
    if (comprobante.comentario && comprobante.comentario !== 'N/A') {
        doc.text('Comentario:', 14, finalY + 10);
        const splitComment = doc.splitTextToSize(comprobante.comentario, 180);
        doc.text(splitComment, 14, finalY + 16);
    }
    
    if (comprobante.estado === 'a retirar') {
        doc.setTextColor(255, 0, 0);  // Cambia el color a rojo
        doc.setFontSize(12);
        doc.text('Deberá mostrar impreso este comprobante para el retiro de los productos. Gracias!', 105, doc.internal.pageSize.height - 20, null, null, 'center');
    }
    
    doc.text('DOCUMENTO NO VALIDO COMO FACTURA', 14, doc.internal.pageSize.height - 15);
    
    // Generar nombre de archivo con el nombre del cliente y el código
    const fileName = `Comprobante_${comprobante.cliente.replace(/[^a-z0-9]/gi, '_')}_${comprobante.codigo}.pdf`;
    doc.save(fileName);
}

// Generar Presupuesto
document.getElementById('generarPresupuesto').addEventListener('click', function() {
    if (carrito.length === 0) {
        mostrarModal('El carrito está vacío');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Título principal
    doc.setFontSize(22);
    doc.text('Ferretería Valle Grande', 105, 15, null, null, 'center');
    
    doc.setFontSize(18);
    doc.text('Presupuesto', 105, 25, null, null, 'center');
    
    doc.setFontSize(12);
    const fechaActual = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    doc.text(`Fecha: ${fechaActual}`, 14, 35);
    
    const columns = ['Código', 'Producto', 'Cant.', 'Precio', 'Desc.', 'Total'];
    const data = carrito.map(item => {
        const subtotal = item.precioVenta * item.cantidad * (1 - item.descuento / 100);
        return [
            item.codigo,
            item.producto,
            item.cantidad,
            formatPrice(item.precioVenta),
            `${item.descuento}%`,
            formatPrice(subtotal)
        ];
    });
    
    const subtotal = carrito.reduce((sum, item) => sum + item.precioVenta * item.cantidad * (1 - item.descuento / 100), 0);
    const descuentoGlobal = parseFloat(document.getElementById('descuentoGlobal').value);
    const totalNeto = subtotal * (1 - descuentoGlobal / 100);
    
    data.push(['', '', '', '', 'Subtotal:', formatPrice(subtotal)]);
    data.push(['', '', '', '', `Desc. Global: ${descuentoGlobal}%`, '']);
    data.push(['', '', '', '', 'Total Neto:', formatPrice(totalNeto)]);
    
    doc.autoTable({
        head: [columns],
        body: data,
        startY: 40,
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20 },
            3: { cellWidth: 30 },
            4: { cellWidth: 20 },
            5: { cellWidth: 30 }
        },
        didDrawPage: function (data) {
            // Pié de página
            doc.setFontSize(8);
            doc.text('Página ' + data.pageCount, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });
    
    const finalY = doc.lastAutoTable.finalY || 40;
    
    doc.setFontSize(10);
    doc.text('Nota: Los precios pueden sufrir actualización sin previo aviso.', 14, finalY + 10);
    doc.text('Métodos de pago aceptados:', 14, finalY + 16);
    doc.text('- Efectivo', 20, finalY + 22);
    doc.text('- Transferencia', 20, finalY + 28);
    doc.text('- Pagos por QR (compatible con todos los bancos y billeteras virtuales)', 20, finalY + 34);
    doc.text('- Tarjeta de crédito', 20, finalY + 40);
    doc.text('- Tarjeta de débito', 20, finalY + 46);
    doc.text('- Tarjeta Naranja (solo en una cuota)', 20, finalY + 52);
    
    // Generar nombre de archivo con la fecha actual
    const fileName = `Presupuesto_Ferreteria_Valle_Grande_${fechaActual.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);

    // NUEVO CÓDIGO: Limpiar el carrito después de generar el presupuesto
    carrito = [];
    actualizarCarrito();
    guardarCarritoEnLocalStorage();
    mostrarModal('Presupuesto generado y carrito limpiado');
});
// Enviar por WhatsApp
document.getElementById('enviarWhatsapp').addEventListener('click', function() {
    const phoneNumber = document.getElementById('whatsappNumber').value;
    if (!phoneNumber) {
        mostrarModal('Por favor, ingrese un número de teléfono');
        return;
    }
    
    const hora = new Date().getHours();
    let saludo;
    if (hora < 12) {
        saludo = "Buenos días";
    } else if (hora < 18) {
        saludo = "Buenas tardes";
    } else {
        saludo = "Buenas noches";
    }
    
    let message = `${saludo}! Gracias por su interés en nuestros productos. `;
    message += 'Aceptamos los siguientes métodos de pago: efectivo, transferencia, pagos por QR (compatible con todos los bancos y billeteras virtuales), tarjeta de crédito, tarjeta de débito y Tarjeta Naranja (solo en una cuota). ';
    
    const whatsappUrl = `https://wa.me/+549${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
});

// Inventario
document.getElementById('cargarInventario').addEventListener('click', function() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawInventario = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                
                // Procesar el inventario
                inventario = rawInventario.slice(1).map(row => {
                    // Verificar si la fila tiene al menos 8 columnas
                    if (row.length < 8) {
                        console.warn('Fila con datos insuficientes:', row);
                        return null;
                    }
                    return {
                        codigo: row[0],
                        producto: row[1],
                        costo: parsePrice(row[2]),
                        margenReal: parsePercentage(row[3]),
                        precioVenta: parsePrice(row[4]),
                        marca: row[5],
                        rubro: row[6],
                        deposito: row[7]
                    };
                }).filter(item => item !== null); // Eliminar filas nulas

                mostrarInventario();
                initializeFuse(); // Inicializar Fuse.js con el nuevo inventario
                guardarInventarioEnLocalStorage();
                mostrarModal('Inventario cargado exitosamente');
            } catch (error) {
                console.error('Error al procesar el archivo:', error);
                mostrarModal('Error al cargar el inventario. Por favor, verifica el formato del archivo.');
            }
        };
        reader.onerror = function() {
            mostrarModal('Error al leer el archivo');
        };
        reader.readAsArrayBuffer(file);
    } else {
        mostrarModal('Por favor, seleccione un archivo');
    }
});

function mostrarInventario() {
    const tbody = document.querySelector('#inventarioTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    inventario.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.producto}</td>
            <td>${formatPrice(item.costo)}</td>
            <td>${(item.margenReal * 100).toFixed(2)}%</td>
            <td>${formatPrice(item.precioVenta)}</td>
            <td>${item.marca}</td>
         // ... (continuación del JavaScript anterior) ...

            <td>${item.rubro}</td>
            <td>${item.deposito}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Actualizar el total de productos en el inventario
    const totalProductosInventario = document.getElementById('totalProductosInventario');
    if (totalProductosInventario) {
        totalProductosInventario.textContent = `Total de productos: ${inventario.length}`;
    }
}

// Registro de ventas
document.getElementById('filtrarVentas').addEventListener('click', function() {
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;
    const ventasFiltradas = ventas.filter(v => v.fecha >= fechaDesde && v.fecha <= fechaHasta);
    mostrarVentas(ventasFiltradas);
});

function mostrarVentas(ventasMostrar) {
    const tbody = document.querySelector('#registroVentas tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    ventasMostrar.forEach(venta => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${venta.fecha}</td>
            <td>${venta.codigo}</td>
            <td>${venta.producto}</td>
            <td>${venta.cantidad}</td>
            <td>${formatPrice(venta.precioVenta)}</td>
            <td>${venta.descuento}% + ${(venta.descuentoGlobal * 100).toFixed(2)}%</td>
            <td>${formatPrice(venta.total)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Descargar Excel
document.getElementById('descargarExcel').addEventListener('click', function() {
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;
    const ventasFiltradas = ventas.filter(v => v.fecha >= fechaDesde && v.fecha <= fechaHasta);
    
    if (ventasFiltradas.length === 0) {
        mostrarModal('No hay ventas para exportar en el rango de fechas seleccionado');
        return;
    }
    
    const ws = XLSX.utils.json_to_sheet(ventasFiltradas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    
    // Generar el archivo Excel
    XLSX.writeFile(wb, `Ventas_${fechaDesde}_${fechaHasta}.xlsx`);
});

// Función de debounce para evitar búsquedas excesivas
function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    }
}

// Función para mostrar el modal
function mostrarModal(mensaje, duracion = 3000) {
    const modal = document.getElementById('modal');
    const modalContent = modal.querySelector('.modal-content');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.textContent = mensaje;
    modal.classList.add('show');
    setTimeout(() => {
        modal.classList.remove('show');
    }, duracion);
}

// Funciones para localStorage
function guardarInventarioEnLocalStorage() {
    localStorage.setItem('inventario', JSON.stringify(inventario));
}

function cargarInventarioDeLocalStorage() {
    const inventarioGuardado = localStorage.getItem('inventario');
    if (inventarioGuardado) {
        inventario = JSON.parse(inventarioGuardado);
        mostrarInventario();
        initializeFuse();
    }
}

function guardarCarritoEnLocalStorage() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function cargarCarritoDeLocalStorage() {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
        actualizarCarrito();
    }
}

function guardarVentasEnLocalStorage() {
    localStorage.setItem('ventas', JSON.stringify(ventas));
}

function cargarVentasDeLocalStorage() {
    const ventasGuardadas = localStorage.getItem('ventas');
    if (ventasGuardadas) {
        ventas = JSON.parse(ventasGuardadas);
        mostrarVentas(ventas);
    }
}

function guardarComprobantesEnLocalStorage() {
    localStorage.setItem('comprobantes', JSON.stringify(comprobantes));
}

function cargarComprobantesDeLocalStorage() {
    const comprobantesGuardados = localStorage.getItem('comprobantes');
    if (comprobantesGuardados) {
        comprobantes = JSON.parse(comprobantesGuardados);
        mostrarComprobantes();
    }
}

// Función para manejar el conteo de recargas
function handleReload() {
    let reloadCount = parseInt(document.getElementById('reloadCount').value);
    reloadCount++;
    document.getElementById('reloadCount').value = reloadCount;

    if (reloadCount > 5) {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('reloadCount').value = '0';
    }
}

// Funciones para la sección de Comprobantes
function mostrarComprobantes(comprobantesFiltrados = comprobantes) {
    const tbody = document.querySelector('#comprobantesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    comprobantesFiltrados.forEach(comprobante => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${comprobante.codigo}</td>
            <td>${comprobante.cliente}</td>
            <td>${formatPrice(comprobante.totalNeto)}</td>
            <td>${comprobante.estado}</td>
            <td class="actions">
                <button class="verComprobante" data-codigo="${comprobante.codigo}"><i class="fas fa-eye"></i></button>
                <button class="descargarComprobante" data-codigo="${comprobante.codigo}"><i class="fas fa-download"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Agregar event listeners a los botones de acción
    document.querySelectorAll('.verComprobante').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            mostrarDetallesComprobante(codigo);
        });
    });

    document.querySelectorAll('.descargarComprobante').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            descargarComprobantePDF(codigo);
        });
    });
}

function buscarComprobantes() {
    const searchTerm = document.getElementById('searchComprobantes').value.toLowerCase();
    if (searchTerm.length === 0) {
        mostrarComprobantes();
        return;
    }
    const comprobantesFiltrados = comprobantes.filter(c => 
        c.codigo.toLowerCase().includes(searchTerm) || 
        c.cliente.toLowerCase().includes(searchTerm)
    );
    mostrarComprobantes(comprobantesFiltrados);
}

function mostrarDetallesComprobante(codigo) {
    const comprobante = comprobantes.find(c => c.codigo === codigo);
    if (!comprobante) return;

    const modal = document.getElementById('comprobanteModal');
    const detallesDiv = document.getElementById('comprobanteDetails');
    const estadoSelect = document.getElementById('comprobanteState');

    detallesDiv.innerHTML = `
        <p><strong>Código:</strong> ${comprobante.codigo}</p>
        <p><strong>Cliente:</strong> ${comprobante.cliente}</p>
        <p><strong>Fecha:</strong> ${comprobante.fecha}</p>
        <p><strong>Subtotal:</strong> ${formatPrice(comprobante.subtotal)}</p>
        <p><strong>Descuento Global:</strong> ${(comprobante.descuentoGlobal * 100).toFixed(2)}%</p>
        <p><strong>Total Neto:</strong> ${formatPrice(comprobante.totalNeto)}</p>
    `;

    const tbody = document.querySelector('#comprobanteProductosTable tbody');
    tbody.innerHTML = '';
    comprobante.items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.producto}</td>
            <td>${item.cantidad}</td>
            <td>${formatPrice(item.precioVenta)}</td>
            <td>${item.descuento}%</td>
            <td>${formatPrice(item.subtotal)}</td>
        `;
        tbody.appendChild(tr);
    });

    estadoSelect.value = comprobante.estado;

    modal.classList.add('show');
}

document.getElementById('updateComprobanteState').addEventListener('click', function() {
    const codigo = document.querySelector('#comprobanteDetails p:first-child').textContent.split(': ')[1];
    const nuevoEstado = document.getElementById('comprobanteState').value;

    const comprobante = comprobantes.find(c => c.codigo === codigo);
    if (comprobante) {
        comprobante.estado = nuevoEstado;
        guardarComprobantesEnLocalStorage();
        mostrarComprobantes();
        document.getElementById('comprobanteModal').classList.remove('show');
        mostrarModal('Estado del comprobante actualizado');
    }
});

document.getElementById('closeComprobanteModal').addEventListener('click', function() {
    document.getElementById('comprobanteModal').classList.remove('show');
});

function descargarComprobantePDF(codigo) {
    const comprobante = comprobantes.find(c => c.codigo === codigo);
    if (comprobante) {
        generarComprobantePDF(comprobante);
    }
}

// Inicialización
window.addEventListener('load', function() {
    handleReload();

    if (parseInt(document.getElementById('reloadCount').value) <= 5) {
        initializeApp();
    }

    // Ocultar sugerencias al hacer clic fuera de ellas
    document.addEventListener('click', function(event) {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer.contains(event.target)) {
            suggestionsContainer.classList.remove('active');
        }
    });

    // Cerrar el modal al hacer clic fuera de él
    const modal = document.getElementById('modal');
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
});