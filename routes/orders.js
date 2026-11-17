const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const Orders = require("../models/orders");
const Products = require("../models/products");
const { getRandomId } = require("../config/global");

// create order and decrement stock atomically with pre-validation
router.post("/create", verifyToken, async (req, res) => {
    try {
        const { uid, role } = req;
        const { products, totalAmount, shippingAddress, paymentMethod } = req.body;

        if (role !== "customer" && role !== "superAdmin") {
            return res.status(403).json({ message: "Only customers can place orders.", isError: true });
        }

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: "Order must include at least one product.", isError: true });
        }

        // Validate stock availability before placing order
        for (const item of products) {
            const p = await Products.findOne({ id: item.productId });
            if (!p) {
                return res.status(404).json({ message: `Product not found: ${item.name || item.productId}`, isError: true });
            }
            if (p.stock < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for "${p.name}". Available: ${p.stock}, Requested: ${item.quantity}`,
                    isError: true
                });
            }
        }

        const id = getRandomId();
        const orderData = { id, uid, products, totalAmount, shippingAddress, paymentMethod: paymentMethod || "COD" };
        const order = await Orders.create(orderData);

        // Safely decrement stock for each product
        await Promise.all(
            products.map(({ productId, quantity }) =>
                Products.findOneAndUpdate({ id: productId }, { $inc: { stock: -quantity } })
            )
        );

        res.status(201).json({ message: "Order created successfully", order, isError: false });

    } catch (error) {
        console.error("CREATE ORDER ERROR:", error);
        res.status(500).json({ message: "Internal server error: " + (error.message || ""), isError: true });
    }
});

// get all orders (superAdmin sees all, customer sees their own)
router.get("/all", verifyToken, async (req, res) => {
    try {
        const { uid, role } = req;

        let orders = [];
        if (role === "superAdmin") {
            orders = await Orders.find().sort({ createdAt: -1 });
        } else {
            orders = await Orders.find({ uid }).sort({ createdAt: -1 });
        }
        res.status(200).json({ message: "Orders fetched successfully", orders, isError: false });
    }
    catch (error) {
        console.error("GET ORDERS ERROR:", error);
        res.status(500).json({ message: "Internal server error: " + (error.message || ""), isError: true });
    }
});

// get single order by id
router.get("/get-single/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { uid, role } = req;

        const order = await Orders.findOne({ id });
        if (!order) { return res.status(404).json({ message: "Order not found", isError: true }); }

        // Non-admin can only view their own orders
        if (role !== "superAdmin" && order.uid !== uid) {
            return res.status(403).json({ message: "Access forbidden", isError: true });
        }

        res.status(200).json({ message: "Order found", order, isError: false });
    } catch (error) {
        console.error("GET SINGLE ORDER ERROR:", error);
        res.status(500).json({ message: "Internal server error: " + (error.message || ""), isError: true });
    }
});

// update order status by superAdmin
router.patch("/update/:id", verifyToken, async (req, res) => {
    try {
        const { role } = req;
        if (role !== "superAdmin") {
            return res.status(403).json({ message: "You are not authorized to update orders", isError: true });
        }
        const { id } = req.params;
        const { orderStatus } = req.body;

        // Auto-update paymentStatus based on orderStatus
        const updateData = { orderStatus };
        if (orderStatus === "delivered") updateData.paymentStatus = "paid";
        if (orderStatus === "cancelled") updateData.paymentStatus = "failed";

        const order = await Orders.findOneAndUpdate({ id }, updateData, { new: true });
        if (!order) { return res.status(404).json({ message: "Order not found", isError: true }); }
        res.status(200).json({ message: "Order updated successfully", order, isError: false });
    }
    catch (error) {
        console.error("UPDATE ORDER ERROR:", error);
        res.status(500).json({ message: "Internal server error: " + (error.message || ""), isError: true });
    }
});

// delete order (superAdmin only)
router.delete("/delete/:id", verifyToken, async (req, res) => {
    try {
        const { role } = req;
        if (role !== "superAdmin") {
            return res.status(403).json({ message: "You are not authorized to delete orders", isError: true });
        }

        const { id } = req.params;
        const order = await Orders.findOne({ id });
        if (!order) { return res.status(404).json({ message: "Order not found", isError: true }); }
        await order.deleteOne();
        res.status(200).json({ message: "Order deleted successfully", order, isError: false });
    }
    catch (error) {
        console.error("DELETE ORDER ERROR:", error);
        res.status(500).json({ message: "Internal server error: " + (error.message || ""), isError: true });
    }
});

module.exports = router;
