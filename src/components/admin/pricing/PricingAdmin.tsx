"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BadgePercent,
  Banknote,
  Loader2,
  Plus,
  Save,
  Settings2,
  Smartphone,
  Tag,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/pricing";
import type {
  CatalogCoupon,
  CatalogOffer,
  CatalogProduct,
  MpesaPaymentSettings,
  ProductKind,
} from "@/lib/pricing/types";

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sign in as admin");
  const res = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

const KIND_LABEL: Record<ProductKind, string> = {
  service: "Career services",
  cv_template: "CV templates",
  cover_letter_template: "Cover letter templates",
  job_action: "Job boosts",
};

export function PricingAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pricing & payments</h1>
        <p className="text-muted-foreground mt-1">
          Set prices for services and templates, run offers and coupons, and switch M-Pesa from sandbox to live.
        </p>
      </div>
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="products">
            <Banknote className="h-4 w-4 mr-1.5" />
            Prices
          </TabsTrigger>
          <TabsTrigger value="coupons">
            <Tag className="h-4 w-4 mr-1.5" />
            Coupons
          </TabsTrigger>
          <TabsTrigger value="offers">
            <BadgePercent className="h-4 w-4 mr-1.5" />
            Offers
          </TabsTrigger>
          <TabsTrigger value="mpesa">
            <Smartphone className="h-4 w-4 mr-1.5" />
            M-Pesa
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Settings2 className="h-4 w-4 mr-1.5" />
            Payments
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="coupons" className="mt-4">
          <CouponsTab />
        </TabsContent>
        <TabsContent value="offers" className="mt-4">
          <OffersTab />
        </TabsContent>
        <TabsContent value="mpesa" className="mt-4">
          <MpesaTab />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Record<string, CatalogProduct>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminFetch<{ products: CatalogProduct[] }>("/api/admin/pricing/products");
      setProducts(json.products);
      setDirty({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load prices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const groups: Record<ProductKind, CatalogProduct[]> = {
      service: [],
      cv_template: [],
      cover_letter_template: [],
      job_action: [],
    };
    for (const product of products) {
      groups[product.kind]?.push(product);
    }
    return groups;
  }, [products]);

  function patch(sku: string, updates: Partial<CatalogProduct>) {
    setProducts((prev) => prev.map((p) => (p.sku === sku ? { ...p, ...updates } : p)));
    setDirty((prev) => {
      const current = products.find((p) => p.sku === sku);
      const next = { ...(prev[sku] || current!), ...updates, sku };
      return { ...prev, [sku]: next };
    });
  }

  async function save() {
    const changed = Object.values(dirty);
    if (changed.length === 0) {
      toast.message("No price changes to save");
      return;
    }
    setSaving(true);
    try {
      const json = await adminFetch<{ products: CatalogProduct[] }>("/api/admin/pricing/products", {
        method: "PUT",
        body: JSON.stringify({ products: changed }),
      });
      setProducts(json.products);
      setDirty({});
      toast.success(`Saved ${changed.length} price${changed.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save prices");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving || Object.keys(dirty).length === 0}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save prices
        </Button>
      </div>
      {(Object.keys(KIND_LABEL) as ProductKind[]).map((kind) => (
        <Card key={kind}>
          <CardHeader>
            <CardTitle>{KIND_LABEL[kind]}</CardTitle>
            <CardDescription>
              {kind === "service"
                ? "Shown on CV, cover letter, and LinkedIn service pages."
                : kind === "job_action"
                  ? "Charged when employers promote or feature a job."
                  : "Shown on template cards in Career Tools."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped[kind].map((product) => (
              <div
                key={product.sku}
                className="grid gap-3 sm:grid-cols-[1fr_110px_110px_90px] items-end rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Price (KES)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={product.price_kes}
                    onChange={(e) => patch(product.sku, { price_kes: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Compare at</Label>
                  <Input
                    type="number"
                    min={0}
                    value={product.compare_at_price_kes ?? ""}
                    placeholder="Optional"
                    onChange={(e) =>
                      patch(product.sku, {
                        compare_at_price_kes: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    checked={product.is_active}
                    onCheckedChange={(checked) => patch(product.sku, { is_active: checked })}
                  />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CouponsTab() {
  const [coupons, setCoupons] = useState<CatalogCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "10",
    min_amount_kes: "",
    max_discount_kes: "",
    applies_to: "all",
    usage_limit: "",
    expires_at: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminFetch<{ coupons: CatalogCoupon[] }>("/api/admin/pricing/coupons");
      setCoupons(json.coupons);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCoupon() {
    setSaving(true);
    try {
      await adminFetch("/api/admin/pricing/coupons", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          discount_value: Number(form.discount_value),
          min_amount_kes: form.min_amount_kes || null,
          max_discount_kes: form.max_discount_kes || null,
          usage_limit: form.usage_limit || null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        }),
      });
      toast.success("Coupon created");
      setForm({ ...form, code: "", description: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(coupon: CatalogCoupon) {
    try {
      await adminFetch(`/api/admin/pricing/coupons/${coupon.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update coupon");
    }
  }

  async function removeCoupon(id: string) {
    if (!confirm("Delete this coupon?")) return;
    try {
      await adminFetch(`/api/admin/pricing/coupons/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete coupon");
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>New coupon</CardTitle>
          <CardDescription>Customers enter the code at checkout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as "percent" | "fixed" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="fixed">Fixed KES</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Value</Label>
              <Input type="number" min={1} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Min amount</Label>
              <Input type="number" value={form.min_amount_kes} onChange={(e) => setForm({ ...form, min_amount_kes: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Max discount</Label>
              <Input type="number" value={form.max_discount_kes} onChange={(e) => setForm({ ...form, max_discount_kes: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Applies to</Label>
            <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everything</SelectItem>
                <SelectItem value="service">Services only</SelectItem>
                <SelectItem value="cv_template">CV templates</SelectItem>
                <SelectItem value="cover_letter_template">Cover letter templates</SelectItem>
                <SelectItem value="job_action">Job boosts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Usage limit</Label>
              <Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Expires</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <Button className="w-full" onClick={() => void createCoupon()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Create coupon
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active coupons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {coupons.length === 0 && <p className="text-sm text-muted-foreground">No coupons yet.</p>}
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-mono font-semibold">{coupon.code}</p>
                <p className="text-sm text-muted-foreground">
                  {coupon.discount_type === "percent" ? `${coupon.discount_value}% off` : formatKes(coupon.discount_value)}
                  {coupon.description ? ` · ${coupon.description}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Used {coupon.used_count}{coupon.usage_limit != null ? ` / ${coupon.usage_limit}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={coupon.is_active} onCheckedChange={() => void toggleCoupon(coupon)} />
                <Button variant="ghost" size="icon" onClick={() => void removeCoupon(coupon.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function OffersTab() {
  const [offers, setOffers] = useState<CatalogOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    badge_text: "SALE",
    description: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "15",
    applies_to: "all",
    starts_at: "",
    ends_at: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminFetch<{ offers: CatalogOffer[] }>("/api/admin/pricing/offers");
      setOffers(json.offers);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createOffer() {
    setSaving(true);
    try {
      await adminFetch("/api/admin/pricing/offers", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          discount_value: Number(form.discount_value),
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        }),
      });
      toast.success("Offer created");
      setForm({ ...form, name: "", description: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create offer");
    } finally {
      setSaving(false);
    }
  }

  async function toggleOffer(offer: CatalogOffer) {
    try {
      await adminFetch(`/api/admin/pricing/offers/${offer.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !offer.is_active }),
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update offer");
    }
  }

  async function removeOffer(id: string) {
    if (!confirm("Delete this offer?")) return;
    try {
      await adminFetch(`/api/admin/pricing/offers/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete offer");
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>New offer</CardTitle>
          <CardDescription>Automatic discount — no code needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Easter sale" />
          </div>
          <div className="space-y-1">
            <Label>Badge</Label>
            <Input value={form.badge_text} onChange={(e) => setForm({ ...form, badge_text: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as "percent" | "fixed" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="fixed">Fixed KES</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Value</Label>
              <Input type="number" min={1} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Applies to</Label>
            <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everything</SelectItem>
                <SelectItem value="service">Services only</SelectItem>
                <SelectItem value="cv_template">CV templates</SelectItem>
                <SelectItem value="cover_letter_template">Cover letter templates</SelectItem>
                <SelectItem value="job_action">Job boosts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Starts</Label>
              <Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Ends</Label>
              <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <Button className="w-full" onClick={() => void createOffer()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Create offer
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Offers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {offers.length === 0 && <p className="text-sm text-muted-foreground">No offers yet.</p>}
          {offers.map((offer) => (
            <div key={offer.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-semibold">{offer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {offer.badge_text ? `${offer.badge_text} · ` : ""}
                  {offer.discount_type === "percent" ? `${offer.discount_value}% off` : formatKes(offer.discount_value)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={offer.is_active} onCheckedChange={() => void toggleOffer(offer)} />
                <Button variant="ghost" size="icon" onClick={() => void removeOffer(offer.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MpesaTab() {
  const [settings, setSettings] = useState<MpesaPaymentSettings | null>(null);
  const [stkConfigured, setStkConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminFetch<{ settings: MpesaPaymentSettings; stkConfigured: boolean }>(
        "/api/admin/payments/mpesa-settings"
      );
      setSettings(json.settings);
      setStkConfigured(json.stkConfigured);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load M-Pesa settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const json = await adminFetch<{ settings: MpesaPaymentSettings; stkConfigured: boolean }>(
        "/api/admin/payments/mpesa-settings",
        { method: "PUT", body: JSON.stringify({ settings }) }
      );
      setSettings(json.settings);
      setStkConfigured(json.stkConfigured);
      toast.success(
        json.settings.environment === "production"
          ? "Live M-Pesa is now selected"
          : "Sandbox M-Pesa is now selected"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save M-Pesa settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) return <LoadingState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>M-Pesa checkout</CardTitle>
        <CardDescription>
          Payments currently go to <span className="font-mono">+254 795 564 135</span> via Send Money.
          Add a till number to offer Buy Goods and Services. Switch sandbox → live when Daraja live credentials are in the environment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base font-semibold">Live payments</Label>
            <p className="text-sm text-muted-foreground">
              Off = Safaricom sandbox. On = production Daraja API.
              {stkConfigured
                ? " STK credentials are present for this environment."
                : " STK credentials for this environment are missing — Send Money and Buy Goods still work."}
            </p>
          </div>
          <Switch
            checked={settings.environment === "production"}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, environment: checked ? "production" : "sandbox" })
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ToggleCard
            title="Send Money"
            description="Pay to a personal M-Pesa number"
            checked={settings.phoneEnabled}
            onCheckedChange={(phoneEnabled) => setSettings({ ...settings, phoneEnabled })}
          />
          <ToggleCard
            title="Buy Goods and Services"
            description="Lipa na M-Pesa till"
            checked={settings.tillEnabled}
            onCheckedChange={(tillEnabled) => setSettings({ ...settings, tillEnabled })}
          />
          <ToggleCard
            title="STK Push"
            description="Prompt appears on the customer phone"
            checked={settings.stkEnabled}
            onCheckedChange={(stkEnabled) => setSettings({ ...settings, stkEnabled })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Send Money number</Label>
            <Input
              value={settings.phoneNumber}
              onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
              placeholder="254795564135"
            />
          </div>
          <div className="space-y-1">
            <Label>Buy Goods till number</Label>
            <Input
              value={settings.tillNumber}
              onChange={(e) => setSettings({ ...settings, tillNumber: e.target.value })}
              placeholder="e.g. 123456"
            />
          </div>
          <div className="space-y-1">
            <Label>Paybill (for STK Paybill mode)</Label>
            <Input
              value={settings.paybillNumber}
              onChange={(e) => setSettings({ ...settings, paybillNumber: e.target.value })}
              placeholder="Optional override"
            />
          </div>
          <div className="space-y-1">
            <Label>Default checkout method</Label>
            <Select
              value={settings.defaultMethod}
              onValueChange={(v) =>
                setSettings({ ...settings, defaultMethod: v as MpesaPaymentSettings["defaultMethod"] })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Send Money</SelectItem>
                <SelectItem value="till">Buy Goods and Services</SelectItem>
                <SelectItem value="stk">STK Push</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>STK transaction type</Label>
            <Select
              value={settings.stkMode}
              onValueChange={(v) => setSettings({ ...settings, stkMode: v as MpesaPaymentSettings["stkMode"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paybill">Paybill</SelectItem>
                <SelectItem value="till">Buy Goods (till)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Account reference</Label>
            <Input
              maxLength={12}
              value={settings.accountReference}
              onChange={(e) => setSettings({ ...settings, accountReference: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save M-Pesa settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

interface AdminPayment {
  id: string;
  transaction_reference: string;
  mpesa_receipt_number: string | null;
  amount: number;
  phone_number: string;
  status: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function PaymentsTab() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminFetch<{ payments: AdminPayment[] }>("/api/admin/payments");
      setPayments(json.payments);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm(id: string, status: "SUCCESS" | "FAILED") {
    try {
      await adminFetch(`/api/admin/payments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(status === "SUCCESS" ? "Payment confirmed" : "Payment rejected");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update payment");
    }
  }

  if (loading) return <LoadingState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent payments</CardTitle>
        <CardDescription>Confirm Send Money / Buy Goods receipts. STK payments confirm automatically via callback.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
        {payments.map((payment) => {
          const method = typeof payment.metadata?.method === "string" ? payment.metadata.method : "stk";
          return (
            <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{formatKes(Number(payment.amount))}</p>
                  <Badge variant={payment.status === "SUCCESS" ? "default" : payment.status === "PENDING" ? "secondary" : "destructive"}>
                    {payment.status}
                  </Badge>
                  <Badge variant="outline">{method}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {payment.description || "Payment"} · {payment.phone_number}
                  {payment.mpesa_receipt_number ? ` · ${payment.mpesa_receipt_number}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.transaction_reference} · {new Date(payment.created_at).toLocaleString()}
                </p>
              </div>
              {payment.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void confirm(payment.id, "SUCCESS")}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void confirm(payment.id, "FAILED")}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
