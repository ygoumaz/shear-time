import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomers, addCustomer, deleteCustomer, updateCustomer } from "../api/api";
import Modal from "../components/Modal";
import styles from "./Customers.module.css";

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [newCustomer, setNewCustomer] = useState({ 
        name: "", 
        phone: "" 
    });
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({
        open: false,
        message: "",
        type: "",
        onConfirm: null,
        customerData: null
    });
    const [editing, setEditing] = useState(null); // { id, field }
    const [tempValue, setTempValue] = useState("");


    const navigate = useNavigate();

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const fetchedCustomers = await getCustomers();
            console.log(fetchedCustomers);
            setCustomers(fetchedCustomers);
        } catch (error) {
            console.error("Error fetching customers:", error);
            setModal({ open: true, message: "Erreur lors de la récupération des clients.", onConfirm: null });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        if (!newCustomer.name || !newCustomer.phone) {
            setModal({ open: true, message: "Veuillez remplir tous les champs.", onConfirm: null });
            return;
        }

        setLoading(true);

        // Optimistically update the UI
        const tempCustomer = { id: Date.now(), ...newCustomer };
        setCustomers((prev) => [...prev, tempCustomer]);

        try {
            await addCustomer(newCustomer);
            await fetchCustomers(); // Ensure we fetch the latest data
        } catch (error) {
            console.error("Failed to add customer:", error);
            setModal({ open: true, message: "Erreur lors de l'ajout du client.", onConfirm: null });
            setCustomers((prev) => prev.filter((c) => c.id !== tempCustomer.id)); // Rollback UI update
        } finally {
            setNewCustomer({ name: "", phone: "" });
            setLoading(false);
        }
    };
    
    // On user click
    // Memorize field info + value
    const handleEdit = (id, field, value) => {
        setEditing({ id, field });
        setTempValue(value);
    };

    // On field update
    // Update value
    const handleChange = (e) => {
        setTempValue(e.target.value);
    };

    // On field deselection
    // Call DB update with all field infos
    const handleBlur = async () => {
        if (editing) {
            const { id, field } = editing;
            await handleUpdateCustomer(id, field, tempValue);
            setEditing(null);
        }
    };

    // On Enter key down
    // Call handleBlur
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    // Update customer in DB with new value
    const handleUpdateCustomer = async (id, field, value) => {
        let updateData = {};
        if (field === "name") {
            updateData = { name: value };
        } else if (field === "phone") {
            updateData = { phone: value };
            if (!(/^\d{0,10}$/.test(value)) || value.length !== 10) {
                console.error("Failed to update phone number: incorrect format");
                setModal({ open: true, message: "Le numéro de téléphone a un format incorrect." });
                return;
            }
        }
        
        setCustomers((prev) =>
            prev.map((customer) =>
                customer.id === id ? { ...customer, [field]: value } : customer
            )
        );

        try {
            await updateCustomer(id, updateData);
            await fetchCustomers();
        } catch (error) {
            console.error("Failed to update customer:", error);
            setModal({ open: true, message: "Erreur lors de la mise à jour du client." });
        }
    };

    const handleDeleteCustomer = (id) => {
        setModal({
            open: true,
            type: "confirm",
            message: "Voulez-vous vraiment supprimer ce client ?\nATTENTION ! TOUS ses rendez-vous associés seront aussi supprimés.",
            onConfirm: async () => {
                setModal({ open: false, message: "", onConfirm: null });
                setCustomers((prev) => prev.filter((c) => c.id !== id));
                try {
                    await deleteCustomer(id);
                    await fetchCustomers();
                } catch (error) {
                    console.error("Failed to delete customer:", error);
                    setModal({ open: true, message: "Erreur lors de la suppression du client.", onConfirm: null });
                }
            }
        });
    };

    return (
        <div>
            <div className={styles.header}>
                <button onClick={() => navigate(-1)} id={styles.backBtn}>Retour</button>
                <h1 className={styles.pageTitle}>Clients</h1>
            </div>
    
            <div className={styles.customerList}>
                <div className={styles.leftPanel}>
                    <h2 className={styles.panelTitle}>Nouveau client</h2>
                    <form onSubmit={handleAddCustomer} className={styles.newCustomerForm}>
                        <label>Nom</label>
                        <input
                            placeholder="John"
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        />
                        <label>Téléphone</label>
                        <input
                            placeholder="0791234567"
                            value={newCustomer.phone}
                            onChange={(e) => {
                                const phone = e.target.value;
                                if (/^\d{0,10}$/.test(phone)) {
                                    setNewCustomer({ ...newCustomer, phone });
                                }
                            }}
                            maxLength="10"
                        />
                        <button type="submit" disabled={loading || !newCustomer.name || !(newCustomer.phone.length === 10)}>
                            {loading ? "Ajout en cours..." : "Ajouter un client"}
                        </button>
                    </form>
                </div>
    
                <div className={styles.rightPanel}>
                    <h2 className={styles.panelTitle}>Liste des clients</h2>
                    <table className={styles.customerTable}>
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Téléphone</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((c) => (
                                    <tr key={c.id} className={styles.customerRow}>
                                        <td onClick={() => handleEdit(c.id, "name", c.name)}>
                                            {editing?.id === c.id && editing.field === "name" ? (
                                                <input
                                                    type="text"
                                                    value={tempValue}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                    className={styles.editInput}
                                                />
                                            ) : (
                                                c.name
                                            )}
                                        </td>
                                        <td onClick={() => handleEdit(c.id, "phone", c.phone)}>
                                            {editing?.id === c.id && editing.field === "phone" ? (
                                                <input
                                                    type="text"
                                                    value={tempValue}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                    className={styles.editInput}
                                                />
                                            ) : (
                                                c.phone
                                            )}
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => handleDeleteCustomer(c.id)} 
                                                className={styles.deleteBtn}
                                            >X</button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {modal.open && <Modal type={modal.type} message={modal.message} customerData={modal.customerData} onClose={() => setModal({ open: false, message: "", onConfirm: null })} onConfirm={modal.onConfirm} />}
            {loading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loader}></div>
                    <p>Chargement...</p>
                </div>
            )}
        </div>
    );
};

export default Customers;
