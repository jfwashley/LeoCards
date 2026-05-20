import { expect, test } from "playwright/test";
import { signUpWithDeck } from "./helpers";

// Phase 9 — Image Upload & Deck Selection.
// Covers the automatable checkpoint steps. OS-level file dialog, real
// clipboard paste, and OS drag-and-drop are intentionally NOT covered
// (cannot be automated); setInputFiles exercises the same onFileSelect path.

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
  const imageBtn = page.getByRole("button", { name: "From image" });
  await expect(typeBtn).toBeVisible();
  await expect(imageBtn).toBeVisible();

  // Type mode: no drop zone present
  await expect(page.getByText("Drop an image here")).toHaveCount(0);

  // 2. Switch to "From image" → drop zone with expected copy
  await imageBtn.click();
  await expect(page.getByText("Drop an image here")).toBeVisible();
  await expect(
    page.getByText("or click to browse, or paste a screenshot (Ctrl+V)"),
  ).toBeVisible();

  const fileInput = page.locator('input[type="file"]');

  // 3. Wrong type rejected with friendly, specific error; no preview
  await fileInput.setInputFiles({
    name: "notes.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a"),
  });
  await expect(page.getByText(/JPG, PNG, or WebP only/i)).toBeVisible();
  await expect(page.getByRole("img", { name: "Selected file" })).toHaveCount(0);

  // 4. Oversized (>5MB) rejected, error names the size
  await fileInput.setInputFiles({
    name: "huge.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1024, 1),
  });
  await expect(page.getByText(/please pick one under 5MB/i)).toBeVisible();
  await expect(page.getByRole("img", { name: "Selected file" })).toHaveCount(0);

  // 5. Valid PNG → contained preview + Step-1 actions
  await fileInput.setInputFiles({
    name: "vocab.png",
    mimeType: "image/png",
    buffer: PNG_1x1,
  });
  const preview = page.getByRole("img", { name: "Selected file" });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveClass(/max-h-64/);
  await expect(
    page.getByRole("button", { name: "Choose different image" }),
  ).toBeVisible();
  const nextBtn = page.getByRole("button", { name: "Next: choose deck" });
  await expect(nextBtn).toBeVisible();

  // 6. X overlay clears back to empty drop zone
  await page.getByRole("button", { name: "Remove selected image" }).click();
  await expect(page.getByText("Drop an image here")).toBeVisible();
  await expect(page.getByRole("img", { name: "Selected file" })).toHaveCount(0);

  // Re-pick a valid image to proceed
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "vocab.png", mimeType: "image/png", buffer: PNG_1x1 });
  await expect(page.getByRole("img", { name: "Selected file" })).toBeVisible();

  // 7. Step 2: deck selector pre-selected, recap thumbnail, Extract present
  await page.getByRole("button", { name: "Next: choose deck" }).click();
  await expect(page.getByText("Add words to:")).toBeVisible();
  await expect(page.getByRole("img", { name: "Selected file" })).toBeVisible();
  const extractBtn = page.getByRole("button", { name: "Extract words" });
  await expect(extractBtn).toBeVisible();
  await expect(extractBtn).toBeEnabled();

  // 8. Extract is a Phase-9 no-op: no navigation, no error, stays on Step 2
  await extractBtn.click();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/deck\/new-card/);
  await expect(extractBtn).toBeVisible();
  await expect(page.getByText("Add words to:")).toBeVisible();

  // 9. Back → returns to preview, image still held
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("img", { name: "Selected file" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next: choose deck" }),
  ).toBeVisible();
});
