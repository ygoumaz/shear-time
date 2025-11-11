import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAppointments, addAppointment, updateAppointment, deleteAppointment, getCustomers } from "../api/api";
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

    const [newAppointment, setNewAppointment] = useState({
        customer_id: "",
        date: "",
        duration_hours: "",
        duration_minutes: ""
    });
    const [selectedDate, setSelectedDate] = useState(null);
    
    const [showPanel, setShowPanel] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ top: 100, left: 100 });
    
    const [searchQuery, setSearchQuery] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [selectedCustomerName, setSelectedCustomerName] = useState("");
    
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
                const [fetchedAppointments, fetchedCustomers] = await Promise.all([
                    getAppointments(),
                    getCustomers(),
                ]);
                setAppointments(fetchedAppointments);
                setCustomers(fetchedCustomers);
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

    const computePanelPosition = (clickPos) => {
        const panelWidth = 322;
        const panelHeight = 353;
        const { clientX, clientY } = clickPos;
        const { innerWidth, innerHeight } = window;
        let left = clientX;
        let top = clientY;
    
        // Prevent overflow on the right
        if (clientX + panelWidth > innerWidth) {
            left = clientX - panelWidth; // Move left instead
        }
    
        // Prevent overflow on the bottom
        if (clientY + panelHeight > innerHeight) {
            top = clientY - panelHeight; // Move up instead
        }

        return {top, left};
    }

    const handleDateClick = useCallback((arg) => {
        const formattedDate = arg.dateStr.slice(0, 16);
        setNewAppointment({ customer_id: "", date: formattedDate, duration_hours: "", duration_minutes: "" });
        setSelectedDate(formattedDate);
        setSearchQuery("");
        setSelectedCustomerName("");
        setShowCustomerDropdown(false);
        
        const panelPosition = computePanelPosition(arg.jsEvent);
        setPanelPosition(panelPosition);
        setShowPanel(true);
    }, []);

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
    

    const handleAddAppointment = async (e) => {
        e.preventDefault();
        const { customer_id, date, duration_hours, duration_minutes } = newAppointment;
        if (!customer_id || !date || (!duration_hours && !duration_minutes)) {
            alert("Veuillez remplir tous les champs.");
            return;
        }

        // Cap appointment end time at 21:00
        const startDate = new Date(date);
        const maxEndDate = new Date(startDate);
        maxEndDate.setHours(21, 0, 0, 0);
        let durationInMinutes = (parseInt(duration_hours) || 0) * 60 + (parseInt(duration_minutes) || 0);
        if (durationInMinutes <= 0) {
            alert("La durée doit être supérieure à 0.");
            return;
        }
        const requestedEndDate = new Date(startDate.getTime() + durationInMinutes * 60000);
        if (requestedEndDate > maxEndDate) {
            durationInMinutes = Math.floor((maxEndDate - startDate) / 60000);
            alert("La durée a été ajustée pour finir au plus tard à 21h.");
        }

        setLoading(true);
        try {
            await addAppointment({ customer_id, date, duration_minutes: durationInMinutes });
            await fetchAppointments();
            setNewAppointment({ customer_id: "", date: "", duration_hours: "", duration_minutes: "" });
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
            const formatDate = (date) => date.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }) + " à " + date.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit"
            }).replace(":", "h");
const dateStr = startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const startStr = startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
const endStr = endDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
const hours = Math.floor(appointment.duration_minutes / 60);
const minutes = appointment.duration_minutes % 60;
const durationStr = (hours ? `${hours}h` : "") + (minutes ? ` ${minutes}min` : "");
const message = 
    `<strong style="font-size:1.2em">${appointment.customer}</strong><br/>
    <span style="margin-top:8px;display:block">${dateStr}</span>
    <span style="margin-top:4px;display:block">${startStr} - ${endStr}</span>
    <span style="margin-top:4px;display:block">Durée : ${durationStr.trim()}</span>`;
            console.log(message);
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
        let durationMinutes = (new Date(info.event.end).getTime() - new Date(info.event.start).getTime()) / 60000;

        // Cap appointment end time at 21:00
        const startDate = new Date(info.event.start);
        const maxEndDate = new Date(startDate);
        maxEndDate.setHours(21, 0, 0, 0);
        const requestedEndDate = new Date(startDate.getTime() + durationMinutes * 60000);
        if (requestedEndDate > maxEndDate) {
            durationMinutes = Math.floor((maxEndDate - startDate) / 60000);
            alert("La durée a été ajustée pour finir au plus tard à 21h.");
        }

        try {
            await updateAppointment(appointmentId, { date, duration_minutes: durationMinutes });
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
                selectable={true}
                editable={true} // Allows dragging
                longPressDelay={200}
                events={appointments.map((a) => ({
                    id: a.id,
                    title: a.customer,
                    start: new Date(a.date),
                    end: new Date(new Date(a.date).getTime() + a.duration_minutes * 60000)
                }))}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                eventDrop={handleEditEvent}
                eventResize={handleEditEvent}
                locale={frLocale}
                slotMinTime="08:00:00"
                slotMaxTime="21:00:00"
                hiddenDays={[0]}
                allDaySlot={false}
                height="auto"
            />


            {showPanel && (
                <div className={styles.appointmentPanel} style={{
                    position: "absolute",
                    top: panelPosition.top,
                    left: panelPosition.left,
                    background: "white",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                }}>
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
                                    setSelectedCustomerName("");
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
                                                    setSelectedCustomerName(customer.name);
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

                        <div>
                            <input
                                type="number"
                                placeholder="Heure(s)"
                                min="0"
                                value={newAppointment.duration_hours}
                                onChange={(e) => setNewAppointment({
                                    ...newAppointment,
                                    duration_hours: e.target.value
                                })}
                                style={{ width: "90px" }}
                            />
                            <input
                                type="number"
                                placeholder="Minute(s)"
                                min="0"
                                max="59"
                                value={newAppointment.duration_minutes}
                                onChange={(e) => setNewAppointment({
                                    ...newAppointment,
                                    duration_minutes: e.target.value
                                })}
                                style={{ width: "90px" }}
                            />
                        </div>

                        <button type="submit" disabled={loading || !newAppointment.customer_id || (!newAppointment.duration_hours && !newAppointment.duration_minutes)}>
                            {loading ? "Ajout en cours..." : "Ajouter Rendez-vous"}
                        </button>
                    </form>
                    <button onClick={() => setShowPanel(false)} id={styles.cancelBtn}>Annuler</button>
                </div>
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
