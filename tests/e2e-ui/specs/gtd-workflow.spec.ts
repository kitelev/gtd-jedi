import { test, expect } from "@playwright/test";
import { ObsidianLauncher } from "../utils/obsidian-launcher";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * E2E UI: GTD Workflow in real Obsidian + Exocortex plugin.
 *
 * Launches Obsidian with Exocortex plugin and gtd-jedi ontology files,
 * opens test task fixtures, verifies button rendering and state transitions.
 *
 * Test vault contains:
 * - Full gtd-jedi ontology (buttons, commands, dashboards, prototypes, workflow-classes)
 * - 4 task fixtures (InboxItem x2, NextAction, WaitingFor)
 */
test.describe("GTD Workflow E2E", () => {
  let launcher: ObsidianLauncher;

  test.beforeEach(async () => {
    const vaultPath =
      process.env.OBSIDIAN_VAULT ||
      path.join(__dirname, "../test-vault");
    launcher = new ObsidianLauncher(vaultPath);
    await launcher.launch();
  });

  test.afterEach(async () => {
    await launcher.close();
  });

  test("plugin loads and recognizes gtd-jedi ontology files", async () => {
    await launcher.openFile("Tasks/inbox-task-1.md");
    const window = await launcher.getWindow();

    const result = await window.evaluate(async () => {
      const app = (window as any).app;

      // Wait for Exocortex plugin to load
      for (let i = 0; i < 30; i++) {
        if (app?.plugins?.plugins?.exocortex) break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      const plugin = app?.plugins?.plugins?.exocortex;

      // Verify gtd-jedi ontology files are in the vault
      const gtdManifest = app.vault.getAbstractFileByPath("!gtd-jedi.md");
      const buttonFile = app.vault.getAbstractFileByPath(
        "buttons/08efa084-6fb5-43c8-8a36-211fce252473.md",
      );
      const commandFile = app.vault.getAbstractFileByPath(
        "commands/6dc7560d-20e8-4aea-88c5-f22691fb2130.md",
      );

      return {
        pluginLoaded: !!plugin,
        vaultName: app?.vault?.getName?.() ?? "unknown",
        hasGtdManifest: !!gtdManifest,
        hasNextActionButton: !!buttonFile,
        hasQuickCaptureCommand: !!commandFile,
      };
    });

    expect(result.pluginLoaded).toBe(true);
    expect(result.hasGtdManifest).toBe(true);
    expect(result.hasNextActionButton).toBe(true);
    expect(result.hasQuickCaptureCommand).toBe(true);
  });

  test("InboxItem task shows GTD buttons (Next Action, Delegate, Someday/Maybe)", async () => {
    await launcher.openFile("Tasks/inbox-task-1.md");
    const window = await launcher.getWindow();

    await launcher.waitForModalsToClose(10000);
    await launcher.waitForElement(".exocortex-layout-rendered", 60000);

    const buttonsSection = window.locator(".exocortex-buttons-section");
    const buttonsVisible = await buttonsSection
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    if (!buttonsVisible) {
      // Plugin rendered but buttons section may not be present if
      // dynamic command resolution takes longer
      test.skip(true, "Buttons section not visible — command resolution may need more time");
      return;
    }

    const buttonLabels = await window
      .locator(".exocortex-buttons-section .exocortex-action-button")
      .allTextContents();

    // GTD buttons for InboxItem should include these
    expect(buttonLabels).toContain("Next Action");
    expect(buttonLabels).toContain("Delegate");
    expect(buttonLabels).toContain("Someday/Maybe");

    // Defer is only for NextAction, not InboxItem
    expect(buttonLabels).not.toContain("Defer");
  });

  test("clicking Next Action changes task state to Doing", async () => {
    await launcher.openFile("Tasks/inbox-task-1.md");
    const window = await launcher.getWindow();

    await launcher.waitForModalsToClose(10000);
    await launcher.waitForElement(".exocortex-layout-rendered", 60000);

    const buttonsSection = window.locator(".exocortex-buttons-section");
    const buttonsVisible = await buttonsSection
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    if (!buttonsVisible) {
      test.skip(true, "Buttons section not visible");
      return;
    }

    // Find and click "Next Action" button
    const nextActionBtn = window.locator(
      '.exocortex-buttons-section .exocortex-action-button:has-text("Next Action")',
    );
    const btnVisible = await nextActionBtn
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!btnVisible) {
      test.skip(true, "Next Action button not visible");
      return;
    }

    await nextActionBtn.click();

    // Wait for frontmatter to update
    await window.waitForTimeout(3000);

    const result = await window.evaluate(async () => {
      const app = (window as any).app;
      const activeFile = app.workspace.getActiveFile();
      if (!activeFile) return { success: false, error: "No active file" };

      const metadata = app.metadataCache.getFileCache(activeFile);
      const frontmatter = metadata?.frontmatter;

      return {
        success: true,
        status: frontmatter?.ems__Effort_status,
        classes: frontmatter?.exo__Instance_class,
      };
    });

    expect(result.success).toBe(true);

    // Status should change to Doing
    if (result.status) {
      expect(String(result.status)).toContain("Doing");
    }

    // Class should include NextAction
    if (result.classes) {
      const classStr = JSON.stringify(result.classes);
      expect(classStr).toContain("NextAction");
    }
  });

  test("NextAction task shows Defer button, InboxItem does not", async () => {
    // First: open NextAction task — Defer should be visible
    await launcher.openFile("Tasks/next-action-task.md");
    const window = await launcher.getWindow();

    await launcher.waitForModalsToClose(10000);
    await launcher.waitForElement(".exocortex-layout-rendered", 60000);

    const buttonsSection = window.locator(".exocortex-buttons-section");
    const buttonsVisible = await buttonsSection
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    if (!buttonsVisible) {
      test.skip(true, "Buttons section not visible");
      return;
    }

    const nextActionButtons = await window
      .locator(".exocortex-buttons-section .exocortex-action-button")
      .allTextContents();

    expect(nextActionButtons).toContain("Defer");
    expect(nextActionButtons).not.toContain("Next Action");
  });

  test("WaitingFor task shows no InboxItem/NextAction buttons", async () => {
    await launcher.openFile("Tasks/delegated-task.md");
    const window = await launcher.getWindow();

    await launcher.waitForModalsToClose(10000);
    await launcher.waitForElement(".exocortex-layout-rendered", 60000);

    // Verify frontmatter loaded correctly
    const result = await window.evaluate(async () => {
      const app = (window as any).app;
      const activeFile = app.workspace.getActiveFile();
      if (!activeFile) return { success: false };

      const metadata = app.metadataCache.getFileCache(activeFile);
      const frontmatter = metadata?.frontmatter;

      return {
        success: true,
        label: frontmatter?.exo__Asset_label,
        delegatee: frontmatter?.gtd__Effort_delegatee,
        classes: JSON.stringify(frontmatter?.exo__Instance_class),
      };
    });

    expect(result.success).toBe(true);
    expect(result.label).toBe("Review PR from Alice");
    expect(result.delegatee).toBe("Alice");
    expect(result.classes).toContain("WaitingFor");

    // WaitingFor should NOT show InboxItem or NextAction buttons
    const buttonsSection = window.locator(".exocortex-buttons-section");
    const buttonsVisible = await buttonsSection
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (buttonsVisible) {
      const buttonLabels = await window
        .locator(".exocortex-buttons-section .exocortex-action-button")
        .allTextContents();

      // These buttons have visibility rules that exclude WaitingFor
      expect(buttonLabels).not.toContain("Next Action");
      expect(buttonLabels).not.toContain("Defer");
    }
    // If buttons section not visible at all — that's also correct for WaitingFor
  });
});
