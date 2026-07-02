import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useListProjects } from "@workspace/api-client-react";
import { 
  Users, CreditCard, ShoppingBag, Clock, Plus, 
  CheckCircle, AlertCircle, Calendar, UserCheck, Edit, DollarSign
} from "lucide-react";

interface Order {
  id: number;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  projectId?: number;
  projectTitle?: string;
  workType: string;
  university?: string;
  price?: string;
  paymentStatus: string;
  deliveryStatus: string;
  assignedTo?: string;
  notes?: string;
  dueDate?: string;
  createdAt: string;
}

interface TeamMember {
  id: number;
  name: string;
  email?: string;
  role: string;
  specialization?: string;
  isActive: boolean;
}

export function CrmDashboard() {
  const { toast } = useToast();
  const { data: projects } = useListProjects();

  const [activeTab, setActiveTab] = useState<"orders" | "team">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showEditStatus, setShowEditStatus] = useState<number | null>(null);

  // New Order fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [orderProjectId, setOrderProjectId] = useState("");
  const [orderWorkType, setOrderWorkType] = useState("");
  const [orderUniversity, setOrderUniversity] = useState("");
  const [orderPrice, setOrderPrice] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderDueDate, setOrderDueDate] = useState("");

  // New Team Member fields
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("writer");
  const [memberSpecialization, setMemberSpecialization] = useState("");

  // Edit status temp fields
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editDeliveryStatus, setEditDeliveryStatus] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const ordersRes = await fetch(`${import.meta.env.BASE_URL}api/crm/orders`);
      const ordersData = await ordersRes.json();
      setOrders(Array.isArray(ordersData) ? ordersData : []);

      const teamRes = await fetch(`${import.meta.env.BASE_URL}api/crm/team`);
      const teamData = await teamRes.json();
      setTeam(Array.isArray(teamData) ? teamData : []);
    } catch (err) {
      toast({ title: "فشل جلب البيانات من السيرفر", variant: "destructive" });
      setOrders([]);
      setTeam([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !orderWorkType) {
      toast({ title: "الرجاء تعبئة الحقول المطلوبة", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/crm/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientEmail,
          clientPhone,
          projectId: orderProjectId || null,
          workType: orderWorkType,
          university: orderUniversity,
          price: parseFloat(orderPrice) || null,
          notes: orderNotes,
          dueDate: orderDueDate || null,
        }),
      });

      if (res.ok) {
        toast({ title: "تم تسجيل الطلب بنجاح" });
        setShowOrderForm(false);
        // Clear fields
        setClientName("");
        setClientEmail("");
        setClientPhone("");
        setOrderProjectId("");
        setOrderWorkType("");
        setOrderUniversity("");
        setOrderPrice("");
        setOrderNotes("");
        setOrderDueDate("");
        fetchData();
      }
    } catch (err) {
      toast({ title: "تعذّر إضافة الطلب", variant: "destructive" });
    }
  };

  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName) {
      toast({ title: "اسم العضو مطلوب", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/crm/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: memberName,
          email: memberEmail,
          role: memberRole,
          specialization: memberSpecialization,
        }),
      });

      if (res.ok) {
        toast({ title: "تم إضافة العضو بنجاح" });
        setShowTeamForm(false);
        setMemberName("");
        setMemberEmail("");
        setMemberRole("writer");
        setMemberSpecialization("");
        fetchData();
      }
    } catch (err) {
      toast({ title: "تعذّر إضافة عضو الفريق", variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (orderId: number) => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/crm/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: editPaymentStatus,
          deliveryStatus: editDeliveryStatus,
          assignedTo: editAssignedTo,
        }),
      });

      if (res.ok) {
        toast({ title: "تم تحديث حالة الطلب" });
        setShowEditStatus(null);
        fetchData();
      }
    } catch (err) {
      toast({ title: "تعذّر تحديث الحالة", variant: "destructive" });
    }
  };

  // Metrics calculators
  const totalRevenue = orders
    .filter(o => o.paymentStatus === "paid" && o.price)
    .reduce((acc, curr) => acc + parseFloat(curr.price || "0"), 0);

  const pendingRevenue = orders
    .filter(o => o.paymentStatus === "pending" && o.price)
    .reduce((acc, curr) => acc + parseFloat(curr.price || "0"), 0);

  return (
    <div className="space-y-8 fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة العملاء والطلبات (CRM)</h1>
          <p className="text-muted-foreground mt-2">متابعة مشاريع العملاء، الدفعات، وأعضاء فريق العمل الأكاديمي</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowOrderForm(true)} className="gap-2 bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" />
            <span>تسجيل طلب جديد</span>
          </Button>
          <Button variant="outline" onClick={() => setShowTeamForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>إضافة كاتب/محرر</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{orders.length}</div>
            <p className="text-xs text-muted-foreground mt-1">طلبات مسجلة بالمنصة</p>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المدفوعات المحصلة</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalRevenue.toFixed(2)} ر.س</div>
            <p className="text-xs text-muted-foreground mt-1">تمت تسويتها بالكامل</p>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-medium">دفعات معلّقة</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingRevenue.toFixed(2)} ر.س</div>
            <p className="text-xs text-muted-foreground mt-1">بانتظار التحصيل</p>
          </CardContent>
        </Card>

        <Card className="hover-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أعضاء الفريق</CardTitle>
            <Users className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{team.length}</div>
            <p className="text-xs text-muted-foreground mt-1">كتّاب ومحررين أكاديميين نشطين</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs list */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-6 py-3 font-semibold border-b-2 text-sm transition-all ${
            activeTab === "orders" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          متابعة الطلبات ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`px-6 py-3 font-semibold border-b-2 text-sm transition-all ${
            activeTab === "team" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          إدارة الفريق ({team.length})
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="text-center py-8">جاري تحميل البيانات...</div>
      ) : activeTab === "orders" ? (
        <div className="space-y-6">
          {/* Add Order Dialog Card */}
          {showOrderForm && (
            <Card className="border-primary/20 bg-primary/5 fade-in-up">
              <CardHeader>
                <CardTitle className="text-lg">تسجيل طلب أكاديمي جديد</CardTitle>
                <CardDescription>أدخل بيانات العميل والمشروع لتوليد طلب تتبع</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateOrder}>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>اسم العميل</Label>
                    <Input required value={clientName} onChange={e => setClientName(e.target.value)} placeholder="مثال: د. محمد العتيبي" />
                  </div>
                  <div className="space-y-2">
                    <Label>بريد العميل الالكتروني</Label>
                    <Input type="email" value={clientEmail} onChange={e => setEditPaymentStatus(e.target.value)} placeholder="name@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الجوال</Label>
                    <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="05xxxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label>ربطه بمشروع بحثي موجود (اختياري)</Label>
                    <Select onValueChange={setOrderProjectId} defaultValue="">
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مشروعا لتتبعه" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(projects) && projects.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>نوع العمل الأكاديمي</Label>
                    <Input required value={orderWorkType} onChange={e => setOrderWorkType(e.target.value)} placeholder="مثال: مشروع تخرج، رسالة ماجستير" />
                  </div>
                  <div className="space-y-2">
                    <Label>الجامعة</Label>
                    <Input value={orderUniversity} onChange={e => setOrderUniversity(e.target.value)} placeholder="جامعة الملك سعود" />
                  </div>
                  <div className="space-y-2">
                    <Label>قيمة العقد (ريال سعودي)</Label>
                    <Input type="number" step="0.01" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} placeholder="500.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ التسليم المتوقع</Label>
                    <Input type="date" value={orderDueDate} onChange={e => setOrderDueDate(e.target.value)} />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label>ملاحظات إضافية</Label>
                    <Textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="تفاصيل بخصوص متطلبات التعديل والتنسيق المطلوبة..." />
                  </div>
                </CardContent>
                <div className="p-6 pt-0 border-t flex justify-end gap-2 bg-muted/10">
                  <Button type="button" variant="ghost" onClick={() => setShowOrderForm(false)}>إلغاء</Button>
                  <Button type="submit">حفظ الطلب</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Orders Table */}
          <div className="overflow-x-auto border rounded-lg bg-background">
            <table className="min-w-full text-right divide-y">
              <thead className="bg-muted/50 text-muted-foreground text-xs font-semibold uppercase">
                <tr>
                  <th className="p-4">العميل</th>
                  <th className="p-4">نوع البحث</th>
                  <th className="p-4">المشروع المرتبط</th>
                  <th className="p-4">السعر</th>
                  <th className="p-4">حالة الدفع</th>
                  <th className="p-4">حالة التسليم</th>
                  <th className="p-4">الكاتب المفوّض</th>
                  <th className="p-4">تاريخ التسليم</th>
                  <th className="p-4 text-left">أدوات</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">لا يوجد طلبات مسجلة حالياً.</td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{order.clientName}</div>
                        <div className="text-xs text-muted-foreground">{order.clientPhone || order.clientEmail}</div>
                      </td>
                      <td className="p-4">{order.workType}</td>
                      <td className="p-4">
                        {order.projectTitle ? (
                          <span className="text-primary font-medium">{order.projectTitle}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">غير مرتبط</span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                        {order.price ? `${order.price} ر.س` : "-"}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          order.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {order.paymentStatus === "paid" ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          <span>{order.paymentStatus === "paid" ? "مدفوع" : "معلّق"}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          order.deliveryStatus === "completed" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : order.deliveryStatus === "in_progress" 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-slate-100 text-slate-800"
                        }`}>
                          <span>
                            {order.deliveryStatus === "completed" 
                              ? "تم التسليم" 
                              : order.deliveryStatus === "in_progress" 
                              ? "قيد المراجعة" 
                              : "طلب جديد"}
                          </span>
                        </span>
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {order.assignedTo || <span className="text-muted-foreground">غير معرّف</span>}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {order.dueDate ? new Date(order.dueDate).toLocaleDateString("ar-SA") : "-"}
                      </td>
                      <td className="p-4 text-left">
                        {showEditStatus === order.id ? (
                          <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded border text-right">
                            <div className="space-y-1">
                              <Label className="text-xs">حالة الدفع</Label>
                              <Select onValueChange={setEditPaymentStatus} defaultValue={order.paymentStatus}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">معلّق</SelectItem>
                                  <SelectItem value="paid">مدفوع</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">حالة التسليم</Label>
                              <Select onValueChange={setEditDeliveryStatus} defaultValue={order.deliveryStatus}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">جديد</SelectItem>
                                  <SelectItem value="in_progress">قيد المراجعة</SelectItem>
                                  <SelectItem value="completed">تم التسليم</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">تعيين كاتب</Label>
                              <Select onValueChange={setEditAssignedTo} defaultValue={order.assignedTo || ""}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="تعيين كاتب..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {team.map(member => <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end gap-1 mt-2">
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowEditStatus(null)}>إلغاء</Button>
                              <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateStatus(order.id)}>حفظ</Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => {
                            setShowEditStatus(order.id);
                            setEditPaymentStatus(order.paymentStatus);
                            setEditDeliveryStatus(order.deliveryStatus);
                            setEditAssignedTo(order.assignedTo || "");
                          }}>
                            <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add Team Member form */}
          {showTeamForm && (
            <Card className="border-primary/20 bg-primary/5 fade-in-up">
              <CardHeader>
                <CardTitle className="text-lg">إضافة كاتب / محرر للفريق</CardTitle>
                <CardDescription>تسجيل كاتب جديد لتفويضه بمشاريع تنسيق وإعداد الأبحاث</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateTeamMember}>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>اسم الكاتب</Label>
                    <Input required value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="الاسم الكامل" />
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>الدور الوظيفي</Label>
                    <Select onValueChange={setMemberRole} defaultValue="writer">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="writer">كاتب محتوى</SelectItem>
                        <SelectItem value="reviewer">محرر ومراجع</SelectItem>
                        <SelectItem value="admin">مدير مكتب</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>التخصص الأكاديمي الدقيق</Label>
                    <Input value={memberSpecialization} onChange={e => setMemberSpecialization(e.target.value)} placeholder="مثال: هندسة برمجيات، دراسات إسلامية" />
                  </div>
                </CardContent>
                <div className="p-6 pt-0 border-t flex justify-end gap-2 bg-muted/10">
                  <Button type="button" variant="ghost" onClick={() => setShowTeamForm(false)}>إلغاء</Button>
                  <Button type="submit">إضافة عضو الفريق</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Team Members List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.length === 0 ? (
              <div className="md:col-span-3 text-center py-8 text-muted-foreground border rounded-lg bg-background">
                لا يوجد أعضاء بالفريق حالياً.
              </div>
            ) : (
              team.map(member => (
                <Card key={member.id} className="hover-card">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold">{member.name}</CardTitle>
                      <CardDescription className="text-xs">{member.email || "بدون بريد"}</CardDescription>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      member.role === "admin" 
                        ? "bg-purple-100 text-purple-800" 
                        : member.role === "reviewer" 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-slate-100 text-slate-800"
                    }`}>
                      {member.role === "admin" ? "مدير" : member.role === "reviewer" ? "محرر ومراجع" : "كاتب"}
                    </span>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserCheck className="w-4 h-4 text-cyan-500" />
                      <span>التخصص: {member.specialization || "عام"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
