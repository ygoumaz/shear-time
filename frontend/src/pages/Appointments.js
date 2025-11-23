import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAppointments, addAppointment, updateAppointment, deleteAppointment, getCustomers, getServices, getAvailableServices } from "../api/api";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import frLocale from "@fullcalendar/core/locales/fr";
import Modal from "../components/Modal";
import styles from "./Appointments.module.css";

const Appointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [services, setServices] = useState({});
    const [availableServices, setAvailableServices] = useState({});

    const [newAppointment, setNewAppointment] = useState({
        customer_id: "",
        date: "",
        service_code: ""
    });
    const [selectedDate, setSelectedDate] = useState(null);
    
    const [showPanel, setShowPanel] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    
    const [modal, setModal] = useState({
        open: false,
        message: "",
        type: "",
        onConfirm: null
    });
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const fetchedAppointments = await getAppointments();
            setAppointments(fetchedAppointments);
        } catch (error) {
            console.error("Error fetching appointments:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [fetchedAppointments, fetchedCustomers, fetchedServices] = await Promise.all([
                    getAppointments(),
                    getCustomers(),
                    getServices()
                ]);
                setAppointments(fetchedAppointments);
                setCustomers(fetchedCustomers);
                setServices(fetchedServices);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }) + " à " + date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit"
        }).replace(":", "h");
    };


    const handleDateClick = useCallback(async (arg) => {
        // If panel is already open, close it instead of opening a new one
        if (showPanel) {
            setShowPanel(false);
            return;
        }
        
        const formattedDate = arg.dateStr.slice(0, 16);
        setNewAppointment({ customer_id: "", date: formattedDate, service_code: "" });
        setSelectedDate(formattedDate);
        setSearchQuery("");
        setShowCustomerDropdown(false);
        
        // Fetch available services for this date/time
        try {
            const available = await getAvailableServices(formattedDate);
            setAvailableServices(available);
        } catch (error) {
            console.error("Error fetching available services:", error);
            setAvailableServices({});
        }
        
        setShowPanel(true);
    }, [showPanel]);

    // Filter customers based on search query
    const filteredCustomers = customers
        .filter(customer => 
            customer.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    // Click outside handler for dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest(`.${styles.customerSearchContainer}`)) {
                setShowCustomerDropdown(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const panelRef = useRef(null);

    // Click outside handler for appointment panel
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setShowPanel(false);
            }
        };
        
        if (showPanel) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPanel]);
    

    const handleAddAppointment = async (e) => {
        e.preventDefault();
        const { customer_id, date, service_code } = newAppointment;
        if (!customer_id || !date || !service_code) {
            alert("Veuillez remplir tous les champs.");
            return;
        }

        setLoading(true);
        try {
            await addAppointment({ customer_id, date, service_code });
            await fetchAppointments();
            setNewAppointment({ customer_id: "", date: "", service_code: "" });
            setShowPanel(false);
        } catch (error) {
            console.error("Failed to add appointment:", error);
            alert("Erreur lors de l'ajout du rendez-vous.");
        } finally {
            setLoading(false);
        }
    };

    const handleEventClick = async (eventClickInfo) => {
        const appointmentId = eventClickInfo.event.id;
        const appointment = appointments.find(a => String(a.id) === String(appointmentId));
        if (appointment) {
            const startDate = new Date(appointment.date);
            const endDate = new Date(startDate.getTime() + appointment.duration_minutes * 60000);
            const dateStr = startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
            const startStr = startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
            const endStr = endDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
            
            const serviceName = appointment.service_code && services[appointment.service_code] 
                ? (() => {
                    const service = services[appointment.service_code];
                    const block = service.blocks[appointment.block_index];
                    return block?.label || service.name;
                })()
                : "Service personnalisé";
            
            const hours = Math.floor(appointment.duration_minutes / 60);
            const minutes = appointment.duration_minutes % 60;
            const durationStr = (hours ? `${hours}h` : "") + (minutes ? ` ${minutes}min` : "");
            
            const message = 
                `<strong style="font-size:1.2em">${appointment.customer}</strong><br/>
                <span style="margin-top:8px;display:block">${serviceName}</span>
                <span style="margin-top:4px;display:block">${dateStr}</span>
                <span style="margin-top:4px;display:block">${startStr} - ${endStr}</span>
                <span style="margin-top:4px;display:block">Durée : ${durationStr.trim()}</span>`;
            
            setModal({
                open: true,
                type: "confirm",
                message,
                onConfirm: async () => {
                    setModal({ open: false, message: "", onConfirm: null });
                    setAppointments((prev) => prev.filter((c) => c.id !== appointmentId));
                    try {
                        await deleteAppointment(appointmentId);
                        await fetchAppointments();
                    } catch (error) {
                        console.error("Failed to delete appointment:", error);
                        setModal({ open: true, message: "Erreur lors de la suppression du rendez-vous.", onConfirm: null });
                    }
                }
            });
        }
    };

    const handleEditEvent = async (info) => {
        const appointmentId = info.event.id;
        const date = info.event.startStr.slice(0, 16);

        try {
            await updateAppointment(appointmentId, { date });
            await fetchAppointments();
        } catch (error) {
            console.error("Error updating appointment:", error);
            alert("Erreur lors de la mise à jour du rendez-vous.");
            info.revert(); // Revert event if update fails 
        }
    }

return (
        <div className={styles.calendarContainer} style={{ position: "relative" }}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Calendrier</h1>
                <button onClick={() => navigate("/customers")} id={styles.customerBtn}>Liste des clients</button>
            </div>

            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                displayEventTime={false}
                selectable={true}
                editable={true} // Allows dragging
                eventResizableFromStart={false}
                eventDurationEditable={false}
                longPressDelay={200}
                events={appointments.map((a) => {
                    let title = a.customer;
                    
                    // Get color from service
                    const eventColor = a.service_code && services[a.service_code] 
                        ? services[a.service_code].color 
                        : '#3788d8'; // Default blue fallback
                    
                    if (a.service_code && services[a.service_code]) {
                        const service = services[a.service_code];
                        const block = service.blocks[a.block_index];
                        
                        if (block && block.code) {
                            // Use block-specific code
                            title = `${a.customer} - ${block.code}`;
                        } else if (block && block.label) {
                            // Fallback to label if no code available
                            title = `${a.customer} - ${block.label}`;
                        } else {
                            // Fallback to service name if block info not available
                            title = `${a.customer} - ${service.name}`;
                        }
                    }
                    
                    return {
                        id: a.id,
                        title: title,
                        start: new Date(a.date),
                        end: new Date(new Date(a.date).getTime() + a.duration_minutes * 60000),
                        backgroundColor: eventColor,
                        borderColor: eventColor
                    };
                })}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                eventDrop={handleEditEvent}
                locale={frLocale}
                slotMinTime="08:00:00"
                slotMaxTime="21:00:00"
                hiddenDays={[0]}
                allDaySlot={false}
                height="auto"
            />


            {showPanel && (
                <>
                    <div className={styles.panelOverlay} onClick={() => setShowPanel(false)} />
                    <div className={styles.appointmentPanel} ref={panelRef}>
                        <h2>Ajouter un rendez-vous</h2>
                        <h3>{formatDate(selectedDate)}</h3>
                        <form onSubmit={handleAddAppointment}>
                        <div className={styles.customerSearchContainer}>
                            <input
                                type="text"
                                placeholder="Rechercher un client..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowCustomerDropdown(true);
                                    setNewAppointment({ ...newAppointment, customer_id: "" });
                                }}
                                onFocus={() => setShowCustomerDropdown(true)}
                                className={styles.searchInput}
                            />
                            
                            {showCustomerDropdown && (
                                <div className={styles.customerDropdown}>
                                    {filteredCustomers.length > 0 ? (
                                        filteredCustomers.map((customer) => (
                                            <div
                                                key={customer.id}
                                                className={styles.customerItem}
                                onClick={() => {
                                    setNewAppointment({ ...newAppointment, customer_id: customer.id });
                                    setSearchQuery(customer.name);
                                    setShowCustomerDropdown(false);
                                }}
                                            >
                                                {customer.name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.noResults}>Aucun client trouvé</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.serviceContainer}>
                            <select
                                value={newAppointment.service_code}
                                onChange={(e) => setNewAppointment({
                                    ...newAppointment,
                                    service_code: e.target.value
                                })}
                                className={styles.serviceSelector}
                            >
                                <option value="">Choisir un service...</option>
                                {Object.entries(availableServices).map(([code, service]) => (
                                    <option key={code} value={code}>
                                        {service.name}
                                    </option>
                                ))}
                            </select>
                            {newAppointment.service_code && availableServices[newAppointment.service_code] && (
                                <div className={styles.serviceTimeline}>
                                    <div className={styles.timelineBlocks}>
                                        {availableServices[newAppointment.service_code].blocks.map((block, index) => (
                                            <div key={index}>
                                                <div className={styles.blockItem}>
                                                    <div className={`${styles.blockCard} ${block.type === 'service' ? styles.serviceBlock : styles.pauseBlock}`}>
                                                        <div className={styles.blockIcon}>
                                                            {block.type === 'service' ? '✂️' : '☕'}
                                                        </div>
                                                        <div className={styles.blockContent}>
                                                            <div className={styles.blockLabel}>
                                                                {block.type === 'service' 
                                                                    ? (block.code ? `${block.label} - ${block.code}` : block.label)
                                                                    : 'Pause'}
                                                            </div>
                                                            <div className={styles.blockDuration}>
                                                                {block.duration} minutes
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {index < availableServices[newAppointment.service_code].blocks.length - 1 && (
                                                    <div className={styles.connector}></div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.timelineSummary}>
                                        <span className={styles.summaryLabel}>Durée totale:</span>
                                        <span className={styles.summaryValue}>
                                            {(() => {
                                                const total = availableServices[newAppointment.service_code].blocks.reduce((sum, block) => sum + block.duration, 0);
                                                const hours = Math.floor(total / 60);
                                                const minutes = total % 60;
                                                return (hours ? `${hours}h` : '') + (minutes ? ` ${minutes}min` : '');
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={loading || !newAppointment.customer_id || !newAppointment.service_code}>
                            {loading ? "Ajout en cours..." : "Ajouter Rendez-vous"}
                        </button>
                    </form>
                        <button onClick={() => setShowPanel(false)} id={styles.cancelBtn}>Annuler</button>
                    </div>
                </>
            )}
            {modal.open && <Modal type={modal.type} message={modal.message} onClose={() => setModal({ open: false, message: "", onConfirm: null })} onConfirm={modal.onConfirm} />}
            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loader}></div>
                    <p>Chargement...</p>
                </div>
            )}
        </div>
    );
};


export default Appointments;
