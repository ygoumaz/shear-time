import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAppointments, addAppointment, updateAppointment, deleteAppointment, getCustomers, getServices, getAssigneeFeasibility, checkConflicts } from "../api/api";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import frLocale from "@fullcalendar/core/locales/fr";
import Holidays from 'date-holidays';
import Modal from "../components/Modal";
import styles from "./Appointments.module.css";

const Appointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [services, setServices] = useState({});

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
    const [showChantal, setShowChantal] = useState(true);
    const [delegatedBlocks, setDelegatedBlocks] = useState([]);
    const [blockConflicts, setBlockConflicts] = useState({}); // keyed by svc_idx, per-assignee: { marie: bool, chantal: bool }
    const [modalAssignee, setModalAssignee] = useState(null);
    const [modalFeasibility, setModalFeasibility] = useState({ marie_available: true, chantal_available: true });
    const [modalAppointmentId, setModalAppointmentId] = useState(null);

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

                // Initialize holidays for Swiss Vaud canton
                const hd = new Holidays('CH', 'VD');
                const currentYear = new Date().getFullYear();
                // Get holidays for current, previous and next year to cover view navigation
                const years = [currentYear - 1, currentYear, currentYear + 1];
                let allHolidays = [];
                
                years.forEach(year => {
                    const yearHolidays = hd.getHolidays(year);
                    const formattedHolidays = yearHolidays.map(h => ({
                        id: `holiday-${h.date}-${h.name}`,
                        title: `🏖️ ${h.name}`,
                        start: h.start, 
                        end: h.end,
                        display: 'background',
                        backgroundColor: '#ffb3b3', // Light red/pink, visible but not too strong
                        borderColor: '#ff8080',
                        classNames: 'public-holiday'
                    }));
                    allHolidays = [...allHolidays, ...formattedHolidays];
                });
                setHolidays(allHolidays);

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
        setDelegatedBlocks([]);
        
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

    // Real-time conflict detection: fetch availability for Marie AND Chantal independently.
    // We run two checks: all-Marie (no delegation) and all-Chantal (all svc blocks delegated).
    // blockConflicts[svc_idx] = { marie: bool, chantal: bool }
    useEffect(() => {
        const { service_code, date } = newAppointment;
        if (!service_code || !date) {
            setBlockConflicts({});
            return;
        }
        let cancelled = false;

        // Determine total number of service blocks for this service
        const svcBlocks = services[service_code]?.blocks ?? [];
        const allSvcIdxs = svcBlocks
            .map((b, i) => ({ b, i }))
            .filter(({ b }) => b.type === 'service')
            .map((_, idx) => idx);

        Promise.all([
            checkConflicts(date, service_code, []),           // all assigned to Marie
            checkConflicts(date, service_code, allSvcIdxs)    // all assigned to Chantal
        ]).then(([marieResults, chantalResults]) => {
            if (cancelled) return;
            const map = {};
            if (Array.isArray(marieResults)) {
                marieResults.forEach(r => {
                    map[r.svc_idx] = { ...map[r.svc_idx], marie: r.conflict };
                });
            }
            if (Array.isArray(chantalResults)) {
                chantalResults.forEach(r => {
                    map[r.svc_idx] = { ...map[r.svc_idx], chantal: r.conflict };
                });
            }
            setBlockConflicts(map);
        }).catch(() => { if (!cancelled) setBlockConflicts({}); });

        return () => { cancelled = true; };
    }, [newAppointment.service_code, newAppointment.date, newAppointment, services]);

    // Click outside handler for appointment panel
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                // Don't close the panel if a modal is open
                setShowPanel(prev => {
                    if (!prev) return prev;
                    const modalEl = document.querySelector('[class*="modalOverlay"]');
                    if (modalEl) return prev;
                    return false;
                });
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
            const result = await addAppointment({ customer_id, date, service_code, delegated_blocks: delegatedBlocks });
            if (result.error) {
                setModal({ open: true, type: "info", message: result.error, onConfirm: null });
                return;
            }
            await fetchAppointments();
            setNewAppointment({ customer_id: "", date: "", service_code: "" });
            setDelegatedBlocks([]);
            setShowPanel(false);
        } catch (error) {
            console.error("Failed to add appointment:", error);
            setModal({ open: true, type: "info", message: "Erreur lors de l'ajout du rendez-vous.", onConfirm: null });
        } finally {
            setLoading(false);
        }
    };

    const handleEventClick = async (eventClickInfo) => {
        const appointmentId = eventClickInfo.event.id;
        // Check if it's a holiday (starts with holiday-)
        if (String(appointmentId).startsWith('holiday-')) {
            return;
        }

        const appointment = appointments.find(a => String(a.id) === String(appointmentId));
        if (appointment) {
            try {
                const feasibility = await getAssigneeFeasibility(appointmentId);
                setModalFeasibility(feasibility);
            } catch {
                setModalFeasibility({ marie_available: true, chantal_available: true });
            }
            setModalAssignee(appointment.assignee || 'marie');
            setModalAppointmentId(appointmentId);

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
                    setModalAppointmentId(null);
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

return (
        <div className={styles.calendarContainer} style={{ position: "relative" }}>
            <div className={styles.header}>
                <label className={styles.chantalToggle}>
                    <span className={styles.chantalToggleLabel}>Chantal</span>
                    <span
                        className={`${styles.chantalToggleTrack} ${showChantal ? styles.chantalToggleTrackOn : ''}`}
                        onClick={() => setShowChantal(v => !v)}
                        role="switch"
                        aria-checked={showChantal}
                        tabIndex={0}
                        onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && setShowChantal(v => !v)}
                    >
                        <span className={styles.chantalToggleThumb} />
                    </span>
                </label>
                <h1 className={styles.pageTitle}>Calendrier</h1>
                <button onClick={() => navigate("/customers")} id={styles.customerBtn}>Liste des clients</button>
            </div>

            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                displayEventTime={false}
                selectable={true}
                editable={false}
                eventResizableFromStart={false}
                eventDurationEditable={false}
                longPressDelay={200}
                events={[
                    ...appointments
                        .filter(a => showChantal || a.assignee !== 'chantal')
                        .map((a) => {
                        let title = a.customer;
                        const isChantal = a.assignee === 'chantal';
                        
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

                        if (isChantal) {
                            title = `Chantal — ${title}`;
                        }
                        
                        return {
                            id: a.id,
                            title: title,
                            start: new Date(a.date),
                            end: new Date(new Date(a.date).getTime() + a.duration_minutes * 60000),
                            backgroundColor: eventColor,
                            borderColor: eventColor,
                            classNames: isChantal ? ['chantal-block'] : []
                        };
                    }),
                    ...holidays
                ]}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
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
                                onChange={(e) => {
                                    setNewAppointment({
                                        ...newAppointment,
                                        service_code: e.target.value
                                    });
                                    setDelegatedBlocks([]);
                                }}
                                className={styles.serviceSelector}
                            >
                                <option value="">Choisir un service...</option>
                                {Object.entries(services).map(([code, service]) => (
                                    <option key={code} value={code}>
                                        {service.name}
                                    </option>
                                ))}
                            </select>
                            {newAppointment.service_code && services[newAppointment.service_code] && (
                                <div className={styles.serviceTimeline}>
                                    <div className={styles.timelineBlocks}>
                                         {(() => {
                                            let svcIdx = 0;
                                            const blocks = services[newAppointment.service_code].blocks;
                                            return blocks.map((block, index) => {
                                                const currentSvcIdx = block.type === 'service' ? svcIdx++ : null;
                                                const isDelegated = block.type === 'service' && delegatedBlocks.includes(currentSvcIdx);
                                                const conflictData = block.type === 'service' ? (blockConflicts[currentSvcIdx] ?? {}) : {};
                                                const marieConflict = conflictData.marie === true;
                                                const chantalConflict = conflictData.chantal === true;
                                                const activeConflict = isDelegated ? chantalConflict : marieConflict;
                                                return (
                                                    <div key={index}>
                                                        <div className={`${styles.blockCard} ${
                                                            block.type === 'service'
                                                                ? styles.serviceBlock
                                                                : styles.pauseBlock
                                                        } ${activeConflict ? styles.blockCardConflict : ''}`}>
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
                                                                    {block.duration} min
                                                                </div>
                                                            </div>
                                            {block.type === 'service' && (
                                                <div className={styles.assignPills}>
                                                    {/* Marie row */}
                                                    <div className={styles.assignPillRow}>
                                                        <button
                                                            type="button"
                                                            className={`${styles.assignPill} ${!isDelegated ? styles.assignPillActive : ''}`}
                                                            disabled={marieConflict}
                                                            onClick={() => setDelegatedBlocks(prev => prev.filter(i => i !== currentSvcIdx))}
                                                            title="Assigner à Marie"
                                                        >
                                                            Marie
                                                        </button>
                                                        <span className={styles.assignPillStatus}>
                                                            {marieConflict ? '❌' : '✅'}
                                                        </span>
                                                    </div>
                                                    {/* Chantal row */}
                                                    <div className={styles.assignPillRow}>
                                                        <button
                                                            type="button"
                                                            className={`${styles.assignPill} ${isDelegated ? styles.assignPillActiveChantal : ''}`}
                                                            disabled={chantalConflict}
                                                            onClick={() => setDelegatedBlocks(prev => [...new Set([...prev, currentSvcIdx])])}
                                                            title="Assigner à Chantal"
                                                        >
                                                            Chantal
                                                        </button>
                                                        <span className={styles.assignPillStatus}>
                                                            {chantalConflict ? '❌' : '✅'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                                        </div>
                                                        {index < blocks.length - 1 && (
                                                            <div className={styles.connector}></div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                    <div className={styles.timelineSummary}>
                                        <span className={styles.summaryLabel}>Durée totale:</span>
                                        <span className={styles.summaryValue}>
                                            {(() => {
                                                const total = services[newAppointment.service_code].blocks.reduce((sum, block) => sum + block.duration, 0);
                                                const hours = Math.floor(total / 60);
                                                const minutes = total % 60;
                                                return (hours ? `${hours}h` : '') + (minutes ? ` ${minutes}min` : '');
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={
                            loading ||
                            !newAppointment.customer_id ||
                            !newAppointment.service_code ||
                            Object.entries(blockConflicts).some(([svcIdx, c]) => {
                                const delegated = delegatedBlocks.includes(Number(svcIdx));
                                return delegated ? c.chantal : c.marie;
                            })
                        }>
                            {loading ? "Ajout en cours..." : "Ajouter Rendez-vous"}
                        </button>
                    </form>
                        <button onClick={() => setShowPanel(false)} id={styles.cancelBtn}>Annuler</button>
                    </div>
                </>
            )}
            {modal.open && (() => {
                const isDisabled =
                    (modalAssignee === 'marie' && !modalFeasibility.chantal_available) ||
                    (modalAssignee === 'chantal' && !modalFeasibility.marie_available);
                return (
                    <Modal
                        type={modal.type}
                        message={modal.message}
                        onClose={() => { setModal({ open: false, message: "", onConfirm: null }); setModalAppointmentId(null); }}
                        onConfirm={modal.onConfirm}
                    >
                        {modalAppointmentId != null && (
                            <div className={styles.reassignSection}>
                                <div className={styles.assignToggleRow}>
                                    <span className={`${styles.assignLabel} ${modalAssignee !== 'chantal' ? styles.assignLabelActive : ''}`}>Marie</span>
                                    <button
                                        type="button"
                                        className={`${styles.assignToggleTrack} ${modalAssignee === 'chantal' ? styles.assignToggleTrackOn : ''} ${isDisabled ? styles.assignToggleDisabled : ''}`}
                                        disabled={isDisabled}
                                        onClick={async () => {
                                            if (isDisabled) return;
                                            const newAssignee = modalAssignee === 'chantal' ? 'marie' : 'chantal';
                                            setModalAssignee(newAssignee);
                                            const result = await updateAppointment(modalAppointmentId, { assignee: newAssignee });
                                            if (result.error) {
                                                setModalAssignee(modalAssignee); // revert
                                                setModal(prev => ({ ...prev, message: prev.message + `<br/><span style="color:red;font-size:0.9em">${result.error}</span>` }));
                                            } else {
                                                await fetchAppointments();
                                            }
                                        }}
                                        aria-label="Changer l'assignée"
                                    >
                                        <span className={styles.assignToggleThumb} />
                                    </button>
                                    <span className={`${styles.assignLabel} ${modalAssignee === 'chantal' ? styles.assignLabelActive : ''}`}>Chantal</span>
                                </div>
                            </div>
                        )}
                    </Modal>
                );
            })()}
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
