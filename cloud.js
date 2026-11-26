(function () {
  "use strict";

  const projectUrl = "https://ziurnmogcetwixcufhnx.supabase.co";
  const publishableKey = "sb_publishable_jgx3pjM4T7pV0hlDLEP35A_3oUUcMs4";
  const redirectUrl = "https://ping-points.vercel.app/";
  const $ = selector => document.querySelector(selector);
  const login = $("#cloud-login"), actions = $("#cloud-actions"), status = $("#cloud-status");
  let session = null;
  let busy = false;
  let client;

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle("error", error);
  }

  function renderSession() {
    login.hidden = Boolean(session);
    actions.hidden = !session;
    for (const button of document.querySelectorAll(".cloud-panel button")) button.disabled = busy || !client;
    if (session) message(`Connecté : ${session.user.email}. La sauvegarde reste manuelle.`);
    else message("Non connecté. Les données restent sur cet appareil.");
  }

  async function perform(task) {
    if (busy) return;
    busy = true;
    renderSession();
    try {
      await task();
    } catch (error) {
      message(`Opération impossible : ${error.message}`, true);
    } finally {
      busy = false;
      for (const button of document.querySelectorAll(".cloud-panel button")) button.disabled = !client;
    }
  }

  function userId() {
    if (!session?.user?.id) throw new Error("Connecte-toi d’abord.");
    return session.user.id;
  }

  function assertSameUser(id) {
    if (userId() !== id) throw new Error("Le compte connecté a changé. Recommence l’opération.");
  }

  async function readBackup(id) {
    const { data, error } = await client.from("ping_backups").select("version,payload,updated_at").eq("user_id", id).maybeSingle();
    if (error) throw error;
    assertSameUser(id);
    if (data) PingBackup.validateBackup(data.payload);
    return data;
  }

  function summary(backup) {
    const value = backup.data;
    const profile = value.profile ? `Profil : ${value.profile.firstName} ${value.profile.lastName}` : "Aucun profil";
    return `${profile}, ${value.matches.length} match(s), ${value.players.length} joueur(s), ${(value.equipment || []).length} entrée(s) de matériel, ${Object.keys(value.arcadeRecords || {}).length} record(s)`;
  }

  try {
    client = PingSupabase.createClient(projectUrl, publishableKey);
  } catch (error) {
    message(`Connexion en ligne indisponible : ${error.message}`, true);
    for (const button of document.querySelectorAll(".cloud-panel button")) button.disabled = true;
    return;
  }

  window.PingCloud = { client, getUserId: () => session?.user?.id ?? null };
  client.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    renderSession();
    window.dispatchEvent(new Event("ping-cloud-session"));
  });

  login.addEventListener("submit", event => {
    event.preventDefault();
    perform(async () => {
      const email = $("#cloud-email").value.trim();
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl, shouldCreateUser: true }
      });
      if (error) throw error;
      message("Si l’e-mail est délivré, ouvre son lien sur cet appareil. L’envoi dépend de la configuration du service de messagerie.");
    });
  });

  $("#cloud-compare").addEventListener("click", () => perform(async () => {
    const id = userId();
    const local = PingApp.backupSnapshot();
    const remote = await readBackup(id);
    if (PingApp.backupSnapshot().raw !== local.raw) throw new Error("Les données locales ont changé pendant la comparaison. Recommence.");
    if (!remote) {
      message(`Cet appareil : ${summary(local.backup)}. Aucune copie en ligne pour ce compte.`);
      return;
    }
    const date = new Date(remote.updated_at);
    const when = Number.isNaN(date.getTime()) ? "date inconnue" : date.toLocaleString("fr-FR");
    message(`Cet appareil : ${summary(local.backup)}. Copie en ligne (${when}) : ${summary(remote.payload)}. Choisis ensuite d’envoyer ou de restaurer ; aucun changement n’a été effectué.`);
  }));

  $("#cloud-upload").addEventListener("click", () => perform(async () => {
    const id = userId();
    const snapshot = PingApp.backupSnapshot();
    const remote = await readBackup(id);
    const existing = remote ? `Copie actuelle en ligne : ${summary(remote.payload)}.\nElle sera remplacée.` : "Aucune copie en ligne n’existe encore.";
    if (!confirm(`${existing}\n\nCopie à envoyer : ${summary(snapshot.backup)}.\n\nEnvoyer cette copie ?`)) return;
    assertSameUser(id);
    if (PingApp.backupSnapshot().raw !== snapshot.raw) throw new Error("Les données locales ont changé depuis l’aperçu. Recommence l’envoi.");
    const { error } = await client.rpc("ping_save_backup", {
      p_user_id: id,
      p_expected_version: remote?.version ?? null,
      p_payload: snapshot.backup
    });
    if (error) throw error;
    assertSameUser(id);
    message("Copie enregistrée en ligne. Les prochaines modifications ne sont pas envoyées automatiquement.");
  }));

  $("#cloud-download").addEventListener("click", () => perform(async () => {
    const id = userId();
    const local = PingApp.backupSnapshot();
    const remote = await readBackup(id);
    if (!remote) throw new Error("Aucune copie en ligne pour ce compte.");
    if (!confirm(`Données sur cet appareil : ${summary(local.backup)}.\nCopie en ligne : ${summary(remote.payload)}.\n\nLa restauration remplace les données locales et les brouillons non enregistrés. Continuer ?`)) return;
    const latest = await readBackup(id);
    if (!latest || latest.version !== remote.version) throw new Error("La copie en ligne a changé depuis l’aperçu. Recommence la restauration.");
    assertSameUser(id);
    if (!PingApp.restoreCloudBackup(remote.payload, local.raw)) throw new Error("La restauration locale a échoué ; les données existantes ont été conservées.");
    message("Copie restaurée sur cet appareil.");
  }));

  $("#cloud-logout").addEventListener("click", () => perform(async () => {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    message("Déconnecté. Les données locales restent sur cet appareil.");
  }));

  $("#cloud-delete").addEventListener("click", () => perform(async () => {
    const id = userId();
    const warning = "Supprimer définitivement ton compte et ses données en ligne : sauvegarde, profil partagé, séances, inscriptions, relations, messages et signalements liés ? Les conversations supprimées disparaîtront aussi pour tes amis. Les données locales et les copies externes resteront sur les appareils. Cette action est irréversible. Une connexion de moins de 15 minutes est nécessaire.";
    if (!confirm(warning)) return;
    if (prompt("Pour confirmer, écris SUPPRIMER :") !== "SUPPRIMER") {
      message("Suppression annulée.");
      return;
    }
    assertSameUser(id);
    const { error } = await client.rpc("ping_delete_own_account");
    if (error) throw error;
    const { error: signOutError } = await client.auth.signOut({ scope: "local" });
    if (signOutError) throw new Error(`Compte supprimé, mais la déconnexion locale a échoué : ${signOutError.message}`);
    message("Compte et données en ligne supprimés. Les données locales restent sur cet appareil.");
  }));
})();
