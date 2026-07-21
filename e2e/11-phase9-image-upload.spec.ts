import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

// Phase 9 — Image Upload & Deck Selection.
// Covers the automatable checkpoint steps. OS-level file dialog, real
// clipboard paste, and OS drag-and-drop are intentionally NOT covered
// (cannot be automated); setInputFiles exercises the same onFileSelect path.
//
// Retargeted for Phase 22 Daybreak re-skin (L-06):
// - Toggle label "From an image" (D-07)
// - Drop zone copy: "Upload a Photo" / "Drop to upload"
// - Picking a valid file auto-advances to Confirm (Pitfall 6)
// - Confirm surface: image-preview + confirm-deck-select + "Extract words"
// - Re-pick button replaces "Back" on the Confirm flow-top
// - "Remove" replaces "Remove selected image"
// - ACThumb uses inline styles (not Tailwind classes)

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=",
  "base64",
);

test("Phase 9: image upload + deck selection flow", async ({ page }) => {
  await signUpWithDeck(page, "French");

  await page.goto("/deck/new-card");
  await page.waitForLoadState("networkidle");

  // 1. Mode toggle renders, defaults to "Type a word"
  const typeBtn = page.getByRole("button", { name: "Type a word" });
  const imageBtn = page.getByRole("button", { name: "From an image" }); // D-07
  await expect(typeBtn).toBeVisible();
  await expect(imageBtn).toBeVisible();

  // Type mode: no drop zone present
  await expect(page.getByText("Upload a Photo")).toHaveCount(0);

  // 2. Switch to "From an image" → drop zone with expected copy
  await imageBtn.click();
  await expect(page.getByText("Upload a Photo")).toBeVisible();
  await expect(page.getByText(/browse your files/)).toBeVisible();

  const fileInput = page.locator('input[type="file"]');

  // 3. Wrong type rejected with friendly, specific error; no preview
  await fileInput.setInputFiles({
    name: "notes.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a"),
  });
  await expect(
    page.getByTestId("file-error").getByText(/JPG, PNG, or WebP only/i),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Selected file" })).toHaveCount(0);

  // 4. Oversized (>20MB, D-07) rejected, error names the size
  await fileInput.setInputFiles({
    name: "huge.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(20 * 1024 * 1024 + 1024, 1),
  });
  await expect(
    page.getByTestId("file-error").getByText(/please pick one under 20MB/i),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Selected file" })).toHaveCount(0);

  // 5. Valid PNG → auto-advances to Confirm surface (image-preview + deck-select + Extract)
  await fileInput.setInputFiles({
    name: "vocab.png",
    mimeType: "image/png",
    buffer: PNG_1x1,
  });
  // Confirm surface rendered: thumbnail visible (structural assertion — ACThumb uses inline styles)
  const preview = page.getByTestId("image-preview");
  await expect(preview).toBeVisible();
  // Confirm controls present
  await expect(
    page.getByRole("button", { name: "Change image" }),
  ).toBeVisible();
  await expect(page.getByTestId("confirm-deck-select")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Extract words" }),
  ).toBeVisible();

  // 6. Remove clears back to empty drop zone
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Upload a Photo")).toBeVisible();
  await expect(page.getByRole("img", { name: "Selected file" })).toHaveCount(0);

  // Re-pick a valid image to proceed
  await page.locator('input[type="file"]').setInputFiles({
    name: "vocab.png",
    mimeType: "image/png",
    buffer: PNG_1x1,
  });
  await expect(page.getByTestId("image-preview")).toBeVisible();

  // 7. Confirm surface: deck selector pre-selected, recap thumbnail, Extract present
  // (auto-advanced on pick — Confirm is already shown)
  await expect(page.getByText("Add words to")).toBeVisible();
  await expect(page.getByTestId("image-preview")).toBeVisible();
  const extractBtn = page.getByRole("button", { name: "Extract words" });
  await expect(extractBtn).toBeVisible();
  await expect(extractBtn).toBeEnabled();

  // 8. Re-pick → returns to drop zone, image still available to re-pick
  // (Clicking Extract is Phase 10's territory — fires /api/extract → owned by
  // the Phase 10 endpoint specs. Phase 9 regression stops at Confirm surface.)
  await page.getByRole("button", { name: "Re-pick" }).click();
  await expect(page.getByText("Upload a Photo")).toBeVisible();
});

test("Phase 9 D-03: Cancel on Extracting returns to Confirm with image preserved", async ({
  page,
}) => {
  await signUpWithDeck(page, "French");

  await page.goto("/deck/new-card");
  await page.waitForLoadState("networkidle");

  // Switch to image mode
  await page.getByRole("button", { name: "From an image" }).click();
  await expect(page.getByText("Upload a Photo")).toBeVisible();

  // Pick a valid image — auto-advances to Confirm
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "vocab.png",
    mimeType: "image/png",
    buffer: PNG_1x1,
  });

  // Confirm surface: image-preview and deck-select visible
  await expect(page.getByTestId("image-preview")).toBeVisible();
  await expect(page.getByTestId("confirm-deck-select")).toBeVisible();

  // Click "Extract words" — this fires the /api/extract request.
  // We intercept it to keep the request pending so we can hit Cancel.
  await page.route("/api/extract", async (route) => {
    // Hold the request — don't fulfill it immediately
    // The Cancel button should appear on the Extracting screen
    await new Promise((resolve) => setTimeout(resolve, 8000));
    await route.abort();
  });

  await page.getByRole("button", { name: "Extract words" }).click();

  // Extracting screen should appear (ACProgress)
  // Cancel button is present on the Extracting screen
  const cancelBtn = page.getByRole("button", { name: "Cancel" });
  await expect(cancelBtn).toBeVisible({ timeout: 5000 });

  // Click Cancel — D-03: should return to Confirm with image + deck preserved
  await cancelBtn.click();

  // Back on Confirm: image-preview STILL visible (no re-pick required)
  await expect(page.getByTestId("image-preview")).toBeVisible();
  // Deck selector still showing the chosen deck
  await expect(page.getByTestId("confirm-deck-select")).toBeVisible();
});
