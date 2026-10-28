import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";

import { AdminTopBar } from "@/components/admin-top-bar";
import { AdminUserRow, formatDate, type Grant } from "@/components/admin-user-row";
import { AppText } from "@/components/app-text";
import { CreateUserCard } from "@/components/create-user-card";
import { PrimaryButton } from "@/components/primary-button";
import { Screen } from "@/components/screen";
import { Section } from "@/components/section";
import { StatColumns } from "@/components/stat-columns";
import { UndoToast } from "@/components/undo-toast";
import { accessStatus, type AccessStatus, displayName, extendAccess, matchesSearch, type Profile } from "@/domain/access";
import { createUser, listProfiles, setAccess } from "@/services/admin";
import { useAccess } from "@/state/access";
import { TabAccount } from "@/state/tab-account";
import { useSignOut } from "@/state/use-sign-out";
import { HIT, radius, space, type, useTheme } from "@/theme";

type Filter = "all" | "active" | "trial" | "expired" | "admin";
const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "trial", label: "Teste" },
  { value: "expired", label: "Vencidos" },
  { value: "admin", label: "Admins" },
];

function inFilter(status: AccessStatus, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return status === "active" || status === "unlimited";
  return status === filter;
}

type Access = Pick<Profile, "accessUntil" | "unlimited" | "plan">;

/** The access an admin grant produces: days add to a running validity; ∞ keeps the date. */
function granted(p: Profile, grant: Grant, now: Date): Access {
  return grant === "unlimited"
    ? { accessUntil: p.accessUntil, unlimited: true, plan: "paid" }
    : { accessUntil: extendAccess(p.accessUntil, grant, now), unlimited: false, plan: "paid" };
}

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { profile: me } = useAccess();
  const leave = useSignOut();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const now = new Date();

  const load = useCallback(() => {
    listProfiles()
      .then((list) => {
        setProfiles(list);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useFocusEffect(load);

  const apply = async (p: Profile, next: Access) => {
    setBusyId(p.id);
    try {
      await setAccess(p.id, { until: next.accessUntil, unlimited: next.unlimited, plan: next.plan });
      setProfiles((list) => list.map((x) => (x.id === p.id ? { ...x, ...next } : x)));
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const grant = async (p: Profile, g: Grant) => {
    const previous: Access = { accessUntil: p.accessUntil, unlimited: p.unlimited, plan: p.plan };
    const next = granted(p, g, new Date());
    if (!(await apply(p, next))) return;
    const what = next.unlimited ? "com acesso ilimitado" : `liberado(a) até ${formatDate(next.accessUntil)}`;
    setToast({ message: `${displayName(p)} ${what}.`, undo: () => void apply(p, previous).then(() => setToast(null)) });
  };

  const counts = useMemo(() => {
    const c = { all: profiles.length, active: 0, trial: 0, expired: 0 };
    for (const p of profiles) {
      const s = accessStatus(p, now);
      if (s === "active" || s === "unlimited") c.active++;
      if (s === "trial") c.trial++;
      if (s === "expired") c.expired++;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recount when the list changes, not every second
  }, [profiles]);

  const shown = profiles.filter((p) => matchesSearch(p, query) && inFilter(accessStatus(p, now), filter));
  const wide = width >= 768;

  return (
    <View style={styles.root}>
      {wide && me && (
        <AdminTopBar
          section="users"
          onSection={(s) => s !== "users" && router.push(`/admin/${s}`)}
          name={displayName(me)}
          email={me.email}
          menu={[
            { label: "Voltar para o app", icon: { ios: "house", android: "home" }, onPress: () => router.navigate("/") },
            { label: "Meu perfil", icon: { ios: "person.crop.circle", android: "account_circle" }, onPress: () => router.navigate("/settings/conta") },
            { label: "Planos e preços", icon: { ios: "creditcard", android: "credit_card" }, onPress: () => router.push("/admin/plans") },
            { label: "Convites", icon: { ios: "envelope", android: "email" }, onPress: () => router.push("/admin/invites") },
            { label: "Termos e Privacidade", icon: { ios: "doc.text", android: "description" }, onPress: () => router.push("/legal/terms") },
            { label: "Sair", icon: { ios: "rectangle.portrait.and.arrow.right", android: "logout" }, destructive: true, onPress: () => void leave() },
          ]}
        />
      )}
      {/* Narrow (a phone, the desktop frame): no top bar, so a way back to Hoje and the avatar sit by the title. */}
      <Screen {...(wide ? {} : { title: "Admin", back: { label: "Hoje", onPress: () => router.navigate("/") }, accessory: <TabAccount /> })}>
        <StatColumns
          columns={wide ? 4 : 2}
          stats={[
            { value: String(counts.all), label: "Contas" },
            { value: String(counts.active), label: "Com plano ativo", color: "successText" },
            { value: String(counts.trial), label: "Em teste grátis", color: "warm" },
            { value: String(counts.expired), label: "Vencidos", color: "danger" },
          ]}
        />

        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nome ou e-mail"
          placeholderTextColor={colors.secondaryLabel}
          accessibilityLabel="Buscar usuário"
          autoCapitalize="none"
          autoCorrect={false}
          style={[type.body, styles.search, { color: colors.label, backgroundColor: colors.surface, borderColor: colors.accent, shadowColor: colors.accent }]}
        />
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f.value }}
              style={[styles.chip, { backgroundColor: filter === f.value ? colors.label : colors.surface }]}>
              <AppText variant="footnote" style={{ color: filter === f.value ? colors.background : colors.secondaryLabel, fontWeight: "600" }}>
                {f.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {creating ? (
          <CreateUserCard
            onCreate={async (name, email) => {
              const { password } = await createUser(name, email);
              load();
              return password;
            }}
            onClose={() => setCreating(false)}
          />
        ) : (
          <View style={styles.actions}>
            <PrimaryButton label="Criar usuário" icon={{ ios: "person.badge.plus", android: "person_add" }} variant="tinted" onPress={() => setCreating(true)} />
            <PrimaryButton label="Criar convite" icon={{ ios: "envelope", android: "mail" }} variant="tinted" onPress={() => router.push("/admin/invites")} />
          </View>
        )}

        {error && <AppText variant="footnote" color="danger">{error}</AppText>}
        {shown.length > 0 && (
          <Section title={`Usuários · ${shown.length}`}>
            {shown.map((p) => (
              <AdminUserRow
                key={p.id}
                profile={p}
                now={now}
                busy={busyId === p.id}
                onGrant={(g) => void grant(p, g)}
                onOpen={() => router.push({ pathname: "/admin/user/[id]", params: { id: p.id } })}
              />
            ))}
          </Section>
        )}
        {shown.length === 0 && !error && (
          <AppText variant="subheadline" color="secondaryLabel" align="center">
            Nenhum usuário encontrado.
          </AppText>
        )}
      </Screen>
      {toast && <UndoToast message={toast.message} onUndo={toast.undo} onHide={() => setToast(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  search: { minHeight: HIT + 8, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.lg, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  actions: { gap: space.sm },
  chip: { paddingHorizontal: space.md, minHeight: 32, justifyContent: "center", borderRadius: radius.pill },
});
