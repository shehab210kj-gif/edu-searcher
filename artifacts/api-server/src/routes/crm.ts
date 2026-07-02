import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, crmOrdersTable, crmTeamMembersTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /crm/orders - Retrieve all orders joined with projects
router.get("/crm/orders", async (req, res): Promise<void> => {
  try {
    const orders = await db
      .select({
        id: crmOrdersTable.id,
        clientName: crmOrdersTable.clientName,
        clientEmail: crmOrdersTable.clientEmail,
        clientPhone: crmOrdersTable.clientPhone,
        projectId: crmOrdersTable.projectId,
        projectTitle: projectsTable.title,
        workType: crmOrdersTable.workType,
        university: crmOrdersTable.university,
        price: crmOrdersTable.price,
        paymentStatus: crmOrdersTable.paymentStatus,
        deliveryStatus: crmOrdersTable.deliveryStatus,
        assignedTo: crmOrdersTable.assignedTo,
        notes: crmOrdersTable.notes,
        dueDate: crmOrdersTable.dueDate,
        createdAt: crmOrdersTable.createdAt,
        updatedAt: crmOrdersTable.updatedAt,
      })
      .from(crmOrdersTable)
      .leftJoin(projectsTable, eq(crmOrdersTable.projectId, projectsTable.id))
      .orderBy(desc(crmOrdersTable.createdAt));

    res.json(orders);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch CRM orders");
    res.status(500).json({ error: "تعذّر جلب طلبات العملاء" });
  }
});

// POST /crm/orders - Create new client order
router.post("/crm/orders", async (req, res): Promise<void> => {
  const { clientName, clientEmail, clientPhone, projectId, workType, university, price, notes, dueDate } = req.body;

  if (!clientName || !workType) {
    res.status(400).json({ error: "اسم العميل ونوع العمل مطلوبان" });
    return;
  }

  try {
    const [order] = await db
      .insert(crmOrdersTable)
      .values({
        clientName,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        projectId: projectId ? parseInt(projectId, 10) : null,
        workType,
        university: university || null,
        price: price ? price.toString() : null,
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    res.status(201).json(order);
  } catch (err) {
    req.log.error({ err }, "Failed to create CRM order");
    res.status(500).json({ error: "تعذّر إنشاء الطلب" });
  }
});

// PATCH /crm/orders/:id - Update order details (payment, writer, delivery status)
router.patch("/crm/orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "معرّف الطلب غير صالح" });
    return;
  }

  const { paymentStatus, deliveryStatus, assignedTo, price, notes, dueDate } = req.body;

  try {
    const [updated] = await db
      .update(crmOrdersTable)
      .set({
        paymentStatus: paymentStatus !== undefined ? paymentStatus : undefined,
        deliveryStatus: deliveryStatus !== undefined ? deliveryStatus : undefined,
        assignedTo: assignedTo !== undefined ? assignedTo : undefined,
        price: price !== undefined ? (price ? price.toString() : null) : undefined,
        notes: notes !== undefined ? notes : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      })
      .where(eq(crmOrdersTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update CRM order");
    res.status(500).json({ error: "تعذّر تحديث بيانات الطلب" });
  }
});

// GET /crm/team - Fetch list of writers and team members
router.get("/crm/team", async (req, res): Promise<void> => {
  try {
    const team = await db
      .select()
      .from(crmTeamMembersTable)
      .orderBy(crmTeamMembersTable.name);
    res.json(team);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch CRM team");
    res.status(500).json({ error: "تعذّر جلب أعضاء فريق العمل" });
  }
});

// POST /crm/team - Add new team member
router.post("/crm/team", async (req, res): Promise<void> => {
  const { name, email, role, specialization } = req.body;

  if (!name) {
    res.status(400).json({ error: "اسم العضو مطلوب" });
    return;
  }

  try {
    const [member] = await db
      .insert(crmTeamMembersTable)
      .values({
        name,
        email: email || null,
        role: role || "writer",
        specialization: specialization || null,
      })
      .returning();

    res.status(201).json(member);
  } catch (err) {
    req.log.error({ err }, "Failed to add team member");
    res.status(500).json({ error: "تعذّر إضافة العضو لفريق العمل" });
  }
});

export default router;
