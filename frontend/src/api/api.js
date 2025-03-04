const API_URL = "http://localhost:5000";

export const getCustomers = async () => {
    const res = await fetch(`${API_URL}/customers`);
    return res.json();
};

export const addCustomer = async (customer) => {
    const res = await fetch(`${API_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
    });
    return res.json();
};

export const updateCustomer = async (id, customer) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer)
    });
    return res.json();
}

export const deleteCustomer = async (id) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        throw new Error("Failed to delete appointment");
    }

    return res.json();
};

export const getAppointments = async () => {
    const res = await fetch(`${API_URL}/appointments`);
    return res.json();
};

export const addAppointment = async (appointment) => {
    const res = await fetch(`${API_URL}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointment),
    });
    return res.json();
};

export const updateAppointment = async (appointmentId, appointment) => {
    const res = await fetch(`${API_URL}/appointments/${appointmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointment)
    });
    return res.json();
}

export const deleteAppointment = async (id) => {
    const res = await fetch(`${API_URL}/appointments/${id}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        throw new Error("Failed to delete appointment");
    }

    return res.json();
};

