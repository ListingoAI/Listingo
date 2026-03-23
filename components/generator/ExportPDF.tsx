"use client"

import type { GenerateResponse } from "@/lib/types"

export async function exportToPDF(
  result: GenerateResponse,
  productName: string
) {
  const { jsPDF } = await import("jspdf")

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const maxWidth = pageWidth - 2 * margin
  let y = 20

  const seoTitle = result.seoTitle ?? ""
  const shortDescription = result.shortDescription ?? ""
  const longDescription = result.longDescription ?? ""
  const metaDescription = result.metaDescription ?? ""
  const tags = Array.isArray(result.tags) ? result.tags : []
  const qualityScore = result.qualityScore ?? 0

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text("Wygenerowano w Listingo", margin, y)
  doc.text(new Date().toLocaleDateString("pl-PL"), pageWidth - margin, y, {
    align: "right",
  })
  y += 15

  doc.setFontSize(18)
  doc.setTextColor(0, 0, 0)
  const nameLines = doc.splitTextToSize(productName, maxWidth)
  doc.text(nameLines, margin, y)
  y += nameLines.length * 8 + 5

  doc.setFontSize(12)
  doc.setTextColor(16, 185, 129)
  doc.text(`Quality Score: ${qualityScore}/100`, margin, y)
  y += 12

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text("TYTUŁ SEO:", margin, y)
  y += 6
  doc.setFontSize(13)
  doc.setTextColor(0, 0, 0)
  const titleLines = doc.splitTextToSize(seoTitle, maxWidth)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 6 + 8

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text("OPIS KRÓTKI:", margin, y)
  y += 6
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  const shortLines = doc.splitTextToSize(shortDescription, maxWidth)
  doc.text(shortLines, margin, y)
  y += shortLines.length * 5 + 8

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text("OPIS DŁUGI:", margin, y)
  y += 6
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  const plainText = longDescription
    .replace(/<h[2-3][^>]*>/g, "\n\n")
    .replace(/<\/h[2-3]>/g, "")
    .replace(/<li[^>]*>/g, "  • ")
    .replace(/<\/li>/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  const longLines = doc.splitTextToSize(plainText, maxWidth)

  for (const line of longLines) {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    doc.text(line, margin, y)
    y += 5
  }
  y += 8

  if (y > 250) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text("TAGI SEO:", margin, y)
  y += 6
  doc.setFontSize(10)
  doc.setTextColor(16, 185, 129)
  const tagsText = tags.join(", ")
  const tagLines = doc.splitTextToSize(tagsText, maxWidth)
  doc.text(tagLines, margin, y)
  y += tagLines.length * 5 + 8

  if (y > 250) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text("META DESCRIPTION:", margin, y)
  y += 6
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  const metaLines = doc.splitTextToSize(metaDescription, maxWidth)
  doc.text(metaLines, margin, y)
  y += metaLines.length * 5 + 15

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    "Wygenerowano za pomocą Listingo — AI opisy produktów",
    margin,
    285
  )

  const fileName = productName
    .replace(/[^a-zA-Z0-9ąęśćżźółńĄĘŚĆŻŹÓŁŃ ]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50)
  doc.save(`${fileName || "produkt"}-opis.pdf`)
}
