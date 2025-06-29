"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, MoveUp, MoveDown, Upload, Eye } from "lucide-react"

// 이름표 형식 정의
const NAME_TAG_FORMATS = [
  { name: "가로형 (93x80mm)", width: 93, height: 80 },
  { name: "가로형 (150x115mm)", width: 150, height: 115 },
  { name: "세로형 (72x110mm)", width: 72, height: 110 },
  { name: "세로형 (103x133mm)", width: 103, height: 133 },
  { name: "세로형 (115x150mm)", width: 115, height: 150 },
  { name: "세로형 (150x210mm)", width: 150, height: 210 },
  { name: "커스텀", width: 0, height: 0 },
]

// 종이 사이즈 정의
const PAPER_SIZES = [
  { name: "A4 (210x297mm)", width: 210, height: 297 },
  { name: "A3 (297x420mm)", width: 297, height: 420 },
  { name: "Letter (216x279mm)", width: 216, height: 279 },
  { name: "커스텀", width: 0, height: 0 },
]

// 배경 이미지 맞춤 옵션
const BACKGROUND_FIT_OPTIONS = [
  { value: "cover", label: "채우기" },
  { value: "contain", label: "맞춤" },
  { value: "fill", label: "늘이기" },
  { value: "none", label: "원본" },
]

// 텍스트 정렬 옵션
const TEXT_ALIGN_OPTIONS = [
  { value: "left", label: "왼쪽" },
  { value: "center", label: "가운데" },
  { value: "right", label: "오른쪽" },
]

interface TextField {
  id: string
  name: string
  description: string
  x: number // mm 단위
  y: number // mm 단위
  fontSize: number // mm 단위
  fontFamily: string
  textAlign: "left" | "center" | "right"
  color: string
  // 테두리 속성 추가
  strokeWidth: number // mm 단위
  strokeColor: string
}

interface Participant {
  id: string
  data: { [key: string]: string }
}

const NameTagGenerator = () => {
  // 형식 선택 상태
  const [selectedFormat, setSelectedFormat] = useState(NAME_TAG_FORMATS[0])
  const [customWidth, setCustomWidth] = useState(90)
  const [customHeight, setCustomHeight] = useState(60)
  const [isCustomFormat, setIsCustomFormat] = useState(false)

  // 명찰 편집 상태
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [backgroundFit, setBackgroundFit] = useState("cover")
  const [textFields, setTextFields] = useState<TextField[]>([
    {
      id: "name",
      name: "이름",
      description: "참석자의 이름",
      x: 45,
      y: 30,
      fontSize: 6,
      fontFamily: "Arial",
      textAlign: "center",
      color: "#000000",
      strokeWidth: 0, // 기본값: 테두리 없음
      strokeColor: "#ffffff", // 기본값: 흰색 테두리
    },
  ])
  const [selectedTextField, setSelectedTextField] = useState<string>("name")

  // 드래그 상태 추가
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // 참석자 표 상태
  const [participants, setParticipants] = useState<Participant[]>([{ id: "1", data: { 이름: "" } }])

  // 출력 설정 상태
  const [selectedPaper, setSelectedPaper] = useState(PAPER_SIZES[0])
  const [customPaperWidth, setCustomPaperWidth] = useState(210)
  const [customPaperHeight, setCustomPaperHeight] = useState(297)
  const [isCustomPaper, setIsCustomPaper] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // 현재 이름표 크기 계산을 useMemo로 최적화
  const currentTagSize = useMemo(() => {
    return isCustomFormat
      ? { width: customWidth, height: customHeight }
      : { width: selectedFormat.width, height: selectedFormat.height }
  }, [isCustomFormat, customWidth, customHeight, selectedFormat])

  // 현재 종이 크기 계산을 useMemo로 최적화
  const currentPaperSize = useMemo(() => {
    return isCustomPaper
      ? { width: customPaperWidth, height: customPaperHeight }
      : { width: selectedPaper.width, height: selectedPaper.height }
  }, [isCustomPaper, customPaperWidth, customPaperHeight, selectedPaper])

  // 캔버스 표시 크기 계산 (컨테이너 크기 제한)
  const canvasDisplaySize = useMemo(() => {
    const maxWidth = 400 // 최대 너비 제한
    const maxHeight = 300 // 최대 높이 제한

    const aspectRatio = currentTagSize.width / currentTagSize.height

    let displayWidth = maxWidth
    let displayHeight = maxWidth / aspectRatio

    if (displayHeight > maxHeight) {
      displayHeight = maxHeight
      displayWidth = maxHeight * aspectRatio
    }

    return { width: displayWidth, height: displayHeight }
  }, [currentTagSize])

  // 캔버스 스케일 계산 (mm -> 표시 픽셀)
  const canvasScale = useMemo(() => {
    return canvasDisplaySize.width / currentTagSize.width
  }, [canvasDisplaySize.width, currentTagSize.width])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // 고해상도를 위한 픽셀 비율
    const pixelRatio = window.devicePixelRatio || 1

    // 캔버스 실제 크기 설정 (고해상도)
    canvas.width = canvasDisplaySize.width * pixelRatio
    canvas.height = canvasDisplaySize.height * pixelRatio

    // 캔버스 표시 크기 설정
    canvas.style.width = `${canvasDisplaySize.width}px`
    canvas.style.height = `${canvasDisplaySize.height}px`

    // 컨텍스트 스케일 설정
    ctx.scale(canvasScale * pixelRatio, canvasScale * pixelRatio)
    ctx.clearRect(0, 0, currentTagSize.width, currentTagSize.height)

    // 배경 그리기
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, currentTagSize.width, currentTagSize.height)

    // 배경 이미지 그리기
    if (backgroundImage) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        ctx.save()

        switch (backgroundFit) {
          case "cover":
            const scale = Math.max(currentTagSize.width / img.width, currentTagSize.height / img.height)
            const scaledWidth = img.width * scale
            const scaledHeight = img.height * scale
            const x = (currentTagSize.width - scaledWidth) / 2
            const y = (currentTagSize.height - scaledHeight) / 2
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
            break
          case "contain":
            const containScale = Math.min(currentTagSize.width / img.width, currentTagSize.height / img.height)
            const containWidth = img.width * containScale
            const containHeight = img.height * containScale
            const containX = (currentTagSize.width - containWidth) / 2
            const containY = (currentTagSize.height - containHeight) / 2
            ctx.drawImage(img, containX, containY, containWidth, containHeight)
            break
          case "fill":
            ctx.drawImage(img, 0, 0, currentTagSize.width, currentTagSize.height)
            break
          case "none":
            ctx.drawImage(img, 0, 0)
            break
        }

        ctx.restore()
        drawTexts()
      }
      img.src = backgroundImage
    } else {
      drawTexts()
    }

    function drawTexts() {
      // 테두리 그리기
      if (!ctx) return
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 0.0
      ctx.strokeRect(0, 0, currentTagSize.width, currentTagSize.height)

      // 텍스트 필드 그리기
      textFields.forEach((field) => {
        // 폰트 크기를 mm 단위로 설정 (스케일링을 고려한 정확한 폰트 크기)
        const actualFontSize = (field.fontSize / canvasScale) * pixelRatio
        ctx.font = `${actualFontSize}px ${field.fontFamily}`
        ctx.textAlign = field.textAlign

        const text = `[${field.name}]`

        // 테두리가 있는 경우 먼저 테두리 그리기
        if (field.strokeWidth > 0) {
          ctx.strokeStyle = field.strokeColor
          ctx.lineWidth = (field.strokeWidth / canvasScale) * pixelRatio
          ctx.lineJoin = "round"
          ctx.miterLimit = 2
          ctx.strokeText(text, field.x, field.y)
        }

        // 텍스트 채우기
        ctx.fillStyle = field.color
        ctx.fillText(text, field.x, field.y)

        // 선택된 텍스트 필드 하이라이트
        if (field.id === selectedTextField) {
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 0.3
          const metrics = ctx.measureText(text)
          const textWidth = metrics.width
          const textHeight = field.fontSize

          let rectX = field.x
          if (field.textAlign === "center") {
            rectX = field.x - textWidth / 2
          } else if (field.textAlign === "right") {
            rectX = field.x - textWidth
          }

          ctx.strokeRect(rectX - 1, field.y - textHeight - 1, textWidth + 2, textHeight + 2)
        }
      })
    }
  }, [currentTagSize, backgroundImage, backgroundFit, textFields, selectedTextField, canvasDisplaySize, canvasScale])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  // 형식 선택 핸들러
  const handleFormatChange = (value: string) => {
    const format = NAME_TAG_FORMATS.find((f) => f.name === value)
    if (format) {
      setSelectedFormat(format)
      setIsCustomFormat(format.name === "커스텀")
      if (format.name !== "커스텀") {
        setCustomWidth(format.width)
        setCustomHeight(format.height)
      }
    }
  }

  // 종이 선택 핸들러
  const handlePaperChange = (value: string) => {
    const paper = PAPER_SIZES.find((p) => p.name === value)
    if (paper) {
      setSelectedPaper(paper)
      setIsCustomPaper(paper.name === "커스텀")
      if (paper.name !== "커스텀") {
        setCustomPaperWidth(paper.width)
        setCustomPaperHeight(paper.height)
      }
    }
  }

  // 배경 이미지 업로드
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setBackgroundImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 텍스트 필드 추가
  const addTextField = () => {
    const newField: TextField = {
      id: `field_${Date.now()}`,
      name: `필드${textFields.length + 1}`,
      description: "",
      x: currentTagSize.width / 2,
      y: currentTagSize.height / 2,
      fontSize: 4,
      fontFamily: "Arial",
      textAlign: "center",
      color: "#000000",
      strokeWidth: 0,
      strokeColor: "#ffffff",
    }
    setTextFields([...textFields, newField])

    // 참석자 데이터에 새 필드 추가
    setParticipants(
      participants.map((p) => ({
        ...p,
        data: { ...p.data, [newField.name]: "" },
      })),
    )
  }

  // 텍스트 필드 삭제
  const removeTextField = (id: string) => {
    if (textFields.length <= 1) return

    const fieldToRemove = textFields.find((f) => f.id === id)
    if (fieldToRemove) {
      setTextFields(textFields.filter((f) => f.id !== id))

      setParticipants(
        participants.map((p) => {
          const newData = { ...p.data }
          delete newData[fieldToRemove.name]
          return { ...p, data: newData }
        }),
      )

      if (selectedTextField === id) {
        setSelectedTextField(textFields[0].id)
      }
    }
  }

  // 텍스트 필드 업데이트를 useCallback으로 최적화
  const updateTextField = useCallback((id: string, updates: Partial<TextField>) => {
    setTextFields((prevFields) =>
      prevFields.map((field) => {
        if (field.id === id) {
          const updatedField = { ...field, ...updates }

          // 이름이 변경된 경우 참석자 데이터도 업데이트
          if (updates.name && updates.name !== field.name) {
            setParticipants((prevParticipants) =>
              prevParticipants.map((p) => {
                const newData = { ...p.data }
                if (updates.name) {
                  newData[updates.name] = newData[field.name] || ""
                  delete newData[field.name]
                }
                return { ...p, data: newData }
              }),
            )
          }

          return updatedField
        }
        return field
      }),
    )
  }, [])

  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      // 표시 픽셀을 mm로 변환
      const x = (event.clientX - rect.left) / canvasScale
      const y = (event.clientY - rect.top) / canvasScale

      // 클릭된 텍스트 필드 찾기
      const clickedField = textFields.find((field) => {
        const hitMargin = 3 // mm
        return (
          x >= field.x - hitMargin &&
          x <= field.x + hitMargin * 6 &&
          y >= field.y - field.fontSize - hitMargin &&
          y <= field.y + hitMargin
        )
      })

      if (clickedField) {
        setSelectedTextField(clickedField.id)
        setIsDragging(true)
        setDragStart({ x: x - clickedField.x, y: y - clickedField.y })
      }
    },
    [canvasScale, textFields],
  )

  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !selectedTextField) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      // 표시 픽셀을 mm로 변환
      const x = (event.clientX - rect.left) / canvasScale
      const y = (event.clientY - rect.top) / canvasScale

      updateTextField(selectedTextField, {
        x: Math.max(0, Math.min(currentTagSize.width, x - dragStart.x)),
        y: Math.max(5, Math.min(currentTagSize.height, y - dragStart.y)),
      })
    },
    [isDragging, selectedTextField, canvasScale, dragStart, updateTextField, currentTagSize],
  )

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 텍스트 정렬 함수
  const alignTextField = (alignment: string) => {
    if (!selectedTextField) return

    const field = textFields.find((f) => f.id === selectedTextField)
    if (!field) return

    let newX = field.x
    let newY = field.y

    // 가로 정렬 (현재 Y 위치 유지)
    if (alignment === "align-left") {
      newX = 5
    } else if (alignment === "align-center") {
      newX = currentTagSize.width / 2
    } else if (alignment === "align-right") {
      newX = currentTagSize.width - 5
    }
    // 세로 정렬 (현재 X 위치 유지)
    else if (alignment === "align-top") {
      newY = 10
    } else if (alignment === "align-middle") {
      newY = currentTagSize.height / 2
    } else if (alignment === "align-bottom") {
      newY = currentTagSize.height - 5
    }
    // 기존 전역 정렬 (호환성 유지)
    else {
      switch (alignment) {
        case "top-left":
          newX = 5
          newY = 10
          break
        case "top-center":
          newX = currentTagSize.width / 2
          newY = 10
          break
        case "top-right":
          newX = currentTagSize.width - 5
          newY = 10
          break
        case "middle-left":
          newX = 5
          newY = currentTagSize.height / 2
          break
        case "middle-center":
          newX = currentTagSize.width / 2
          newY = currentTagSize.height / 2
          break
        case "middle-right":
          newX = currentTagSize.width - 5
          newY = currentTagSize.height / 2
          break
        case "bottom-left":
          newX = 5
          newY = currentTagSize.height - 5
          break
        case "bottom-center":
          newX = currentTagSize.width / 2
          newY = currentTagSize.height - 5
          break
        case "bottom-right":
          newX = currentTagSize.width - 5
          newY = currentTagSize.height - 5
          break
      }
    }

    updateTextField(selectedTextField, { x: newX, y: newY })
  }

  // 참석자 추가
  const addParticipant = () => {
    const newParticipant: Participant = {
      id: `participant_${Date.now()}`,
      data: {},
    }

    textFields.forEach((field) => {
      newParticipant.data[field.name] = ""
    })

    setParticipants([...participants, newParticipant])
  }

  // 참석자 삭제
  const removeParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id))
  }

  // 참석자 데이터 업데이트를 useCallback으로 최적화
  const updateParticipantData = useCallback(
    (id: string, fieldName: string, value: string) => {
      setParticipants((prevParticipants) => {
        const newParticipants = prevParticipants.map((p) => {
          if (p.id === id) {
            return { ...p, data: { ...p.data, [fieldName]: value } }
          }
          return p
        })

        // 마지막 행이 입력되면 새 행 추가
        const participant = newParticipants.find((p) => p.id === id)
        if (participant && id === newParticipants[newParticipants.length - 1].id) {
          const hasData = Object.values(participant.data).some((v) => v.trim() !== "")
          if (hasData && value.trim() !== "") {
            const newParticipant: Participant = {
              id: `participant_${Date.now()}`,
              data: {},
            }

            textFields.forEach((field) => {
              newParticipant.data[field.name] = ""
            })

            return [...newParticipants, newParticipant]
          }
        }

        return newParticipants
      })
    },
    [textFields],
  )

  // 참석자 순서 변경
  const moveParticipant = (id: string, direction: "up" | "down") => {
    const index = participants.findIndex((p) => p.id === id)
    if (index === -1) return

    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= participants.length) return

    const newParticipants = [...participants]
    const temp = newParticipants[index]
    newParticipants[index] = newParticipants[newIndex]
    newParticipants[newIndex] = temp

    setParticipants(newParticipants)
  }

  // 한 종이당 들어갈 수 있는 이름표 수 계산
  const calculateTagsPerPage = () => {
    const margin = 10
    const tagWidth = currentTagSize.width + margin
    const tagHeight = currentTagSize.height + margin

    const cols = Math.floor(currentPaperSize.width / tagWidth)
    const rows = Math.floor(currentPaperSize.height / tagHeight)

    return { cols, rows, total: cols * rows }
  }

  // 이름표 배치 결과를 메모이즈
  const tagsPerPageMemo = useMemo(
    () => calculateTagsPerPage(),
    [currentTagSize.width, currentTagSize.height, currentPaperSize.width, currentPaperSize.height],
  )

  // SVG로 이미지 변환 (프린터 호환성 향상)
  const convertImageToSVG = useCallback((imageData: string, width: number, height: number): string => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
           width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
        <image href="${imageData}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>
      </svg>
    `)}`
  }, [])

  const handlePrint = useCallback(() => {
    const validParticipants = participants.filter((p) => Object.values(p.data).some((v) => v.trim() !== ""))

    if (validParticipants.length === 0) {
      alert("출력할 참석자 데이터가 없습니다.")
      return
    }

    // 배경 이미지를 SVG로 변환하는 함수
    const processBackgroundImage = () => {
      return new Promise<string>((resolve) => {
        if (!backgroundImage) {
          resolve("")
          return
        }

        // SVG 형태로 이미지 임베드 (프린터 호환성 최대화)
        const svgImage = convertImageToSVG(backgroundImage, currentTagSize.width, currentTagSize.height)
        resolve(svgImage)
      })
    }

    // 출력 페이지 생성 함수
    const createPrintPage = (backgroundSVG: string) => {
      const printWindow = window.open("", "_blank")
      if (!printWindow) return

      const totalPages = Math.ceil(validParticipants.length / tagsPerPageMemo.total)

      // CSS에서 mm 단위 직접 사용 (프린터 호환성 향상)
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>이름표 출력</title>
          <style>
            @page { 
              margin: 0; 
              size: ${currentPaperSize.width}mm ${currentPaperSize.height}mm; 
            }
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            body { 
              font-family: Arial, sans-serif; 
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page { 
              width: ${currentPaperSize.width}mm; 
              height: ${currentPaperSize.height}mm; 
              display: grid; 
              grid-template-columns: repeat(${tagsPerPageMemo.cols}, ${currentTagSize.width}mm);
              grid-template-rows: repeat(${tagsPerPageMemo.rows}, ${currentTagSize.height}mm);
              gap: ${(currentPaperSize.width - tagsPerPageMemo.cols * currentTagSize.width) / (tagsPerPageMemo.cols + 1)}mm;
              padding: ${(currentPaperSize.height - tagsPerPageMemo.rows * currentTagSize.height) / (tagsPerPageMemo.rows + 1)}mm;
              justify-content: center;
              align-content: center;
              page-break-after: always;
            }
            .page:last-child { 
              page-break-after: avoid; 
            }
            .name-tag { 
              width: ${currentTagSize.width}mm; 
              height: ${currentTagSize.height}mm; 
              border: 0.5mm solid #000000; 
              position: relative;
              background: white;
              overflow: hidden;
            }
            .background-image {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 1;
            }
            .text-field {
              position: absolute;
              white-space: nowrap;
              line-height: 1;
              z-index: 2;
            }
          </style>
        </head>
        <body>
      `

      for (let page = 0; page < totalPages; page++) {
        htmlContent += '<div class="page">'

        for (let i = 0; i < tagsPerPageMemo.total; i++) {
          const participantIndex = page * tagsPerPageMemo.total + i
          const participant = validParticipants[participantIndex]

          htmlContent += '<div class="name-tag">'

          // 배경 이미지 추가 (SVG 사용)
          if (backgroundSVG) {
            htmlContent += `<img src="${backgroundSVG}" class="background-image" alt="" />`
          }

          if (participant) {
            textFields.forEach((field) => {
              const text = participant.data[field.name] || ""

              // 기존의 text-shadow 방식을 제거하고 -webkit-text-stroke 사용
              // 텍스트 스타일 생성 (테두리 포함)
              let textStyle = `
                left: ${field.x}mm;
                top: ${field.y - field.fontSize}mm;
                font-size: ${field.fontSize}mm;
                font-family: ${field.fontFamily};
                text-align: ${field.textAlign};
                color: ${field.color};
                ${field.textAlign === "center" ? "transform: translateX(-50%);" : ""}
                ${field.textAlign === "right" ? "transform: translateX(-100%);" : ""}
              `

              // 테두리가 있는 경우 -webkit-text-stroke 사용
              if (field.strokeWidth > 0) {
                textStyle += `
                  -webkit-text-stroke: ${field.strokeWidth}mm ${field.strokeColor};
                  -webkit-text-fill-color: ${field.color};
                `
              }

              htmlContent += `
                <div class="text-field" style="${textStyle}">${text}</div>
              `
            })
          }

          htmlContent += "</div>"
        }

        htmlContent += "</div>"
      }

      htmlContent += "</body></html>"

      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // 이미지 로딩 완료 후 출력
      setTimeout(() => {
        printWindow.print()
      }, 2000)
    }

    // 배경 이미지 처리 후 출력 페이지 생성
    processBackgroundImage().then(createPrintPage)
  }, [participants, tagsPerPageMemo, currentPaperSize, currentTagSize, textFields, backgroundImage, convertImageToSVG])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">이름표 생성기</h1>
          <p className="text-gray-600 mt-2">참석자 이름표를 쉽게 만들고 출력하세요</p>
        </div>

        {/* 형식 선택 */}
        <Card>
          <CardHeader>
            <CardTitle>형식 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="format">이름표 형식</Label>
                <Select value={selectedFormat.name} onValueChange={handleFormatChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NAME_TAG_FORMATS.map((format) => (
                      <SelectItem key={format.name} value={format.name}>
                        {format.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="width">가로 (mm)</Label>
                <Input
                  id="width"
                  type="number"
                  value={isCustomFormat ? customWidth : selectedFormat.width}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  disabled={!isCustomFormat}
                />
              </div>
              <div>
                <Label htmlFor="height">세로 (mm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={isCustomFormat ? customHeight : selectedFormat.height}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  disabled={!isCustomFormat}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 메인 편집 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 명찰 수정 */}
          <Card>
            <CardHeader>
              <CardTitle>명찰 수정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 배경 이미지 설정 */}
              <div className="space-y-2">
                <Label>배경 이미지</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    이미지 업로드
                  </Button>
                  <Select value={backgroundFit} onValueChange={setBackgroundFit}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUND_FIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* 캔버스 컨테이너 - 크기 제한 적용 */}
              <div ref={canvasContainerRef} className="border rounded-lg p-4 bg-white flex justify-center">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  className="border cursor-crosshair"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "300px",
                  }}
                />
              </div>

              {/* 텍스트 필드 관리 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>텍스트 필드</Label>
                  <Button size="sm" onClick={addTextField}>
                    <Plus className="w-4 h-4 mr-1" />
                    필드 추가
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>설명</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {textFields.map((field) => (
                      <TableRow
                        key={field.id}
                        className={selectedTextField === field.id ? "bg-blue-50" : ""}
                        onClick={() => setSelectedTextField(field.id)}
                      >
                        <TableCell>
                          <Input
                            value={field.name}
                            onChange={(e) => updateTextField(field.id, { name: e.target.value })}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={field.description}
                            onChange={(e) => updateTextField(field.id, { description: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeTextField(field.id)}
                            disabled={textFields.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 선택된 텍스트 필드 설정 */}
              {selectedTextField && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium">텍스트 설정</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>폰트 크기 (mm)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="1"
                        max="20"
                        value={textFields.find((f) => f.id === selectedTextField)?.fontSize || 4}
                        onChange={(e) => updateTextField(selectedTextField, { fontSize: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>정렬</Label>
                      <Select
                        value={textFields.find((f) => f.id === selectedTextField)?.textAlign || "center"}
                        onValueChange={(value) =>
                          updateTextField(selectedTextField, { textAlign: value as "left" | "center" | "right" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEXT_ALIGN_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>폰트</Label>
                      <Input
                        value={textFields.find((f) => f.id === selectedTextField)?.fontFamily || "Arial"}
                        onChange={(e) => updateTextField(selectedTextField, { fontFamily: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>글자 색상</Label>
                      <Input
                        type="color"
                        value={textFields.find((f) => f.id === selectedTextField)?.color || "#000000"}
                        onChange={(e) => updateTextField(selectedTextField, { color: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>테두리 두께 (mm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={textFields.find((f) => f.id === selectedTextField)?.strokeWidth || 0}
                        onChange={(e) => updateTextField(selectedTextField, { strokeWidth: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>테두리 색상</Label>
                      <Input
                        type="color"
                        value={textFields.find((f) => f.id === selectedTextField)?.strokeColor || "#ffffff"}
                        onChange={(e) => updateTextField(selectedTextField, { strokeColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>위치 정렬</Label>

                    {/* 가로 정렬 */}
                    <div className="mt-2 mb-3">
                      <Label className="text-sm text-gray-600 mb-1 block">가로 정렬 (현재 세로 위치 유지)</Label>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alignTextField("align-left")}
                          className="flex-1"
                        >
                          왼쪽
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alignTextField("align-center")}
                          className="flex-1"
                        >
                          가운데
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alignTextField("align-right")}
                          className="flex-1"
                        >
                          오른쪽
                        </Button>
                      </div>
                    </div>

                    {/* 세로 정렬 */}
                    <div className="mb-3">
                      <Label className="text-sm text-gray-600 mb-1 block">세로 정렬 (현재 가로 위치 유지)</Label>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alignTextField("align-top")}
                          className="flex-1"
                        >
                          위쪽
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alignTextField("align-middle")}
                          className="flex-1"
                        >
                          가운데
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alignTextField("align-bottom")}
                          className="flex-1"
                        >
                          아래쪽
                        </Button>
                      </div>
                    </div>

                    {/* 전역 정렬 (기존 9방향) */}
                    <div>
                      <Label className="text-sm text-gray-600 mb-1 block">전역 정렬 (가로+세로 동시)</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <Button size="sm" variant="outline" onClick={() => alignTextField("top-left")}>
                          ↖
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alignTextField("top-center")}>
                          ↑
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alignTextField("top-right")}>
                          ↗
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alignTextField("middle-left")}>
                          ←
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alignTextField("middle-center")}>
                          ●
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alignTextField("middle-right")}>
                          →
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alignTextField("bottom-left")}>
                          ↙
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alignTextField("bottom-center")}>
                          ↓
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => alignTextField("bottom-right")}>
                          ↘
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 오른쪽: 참석자 표 */}
          <Card>
            <CardHeader>
              <CardTitle>참석자 표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    총 {participants.filter((p) => Object.values(p.data).some((v) => v.trim() !== "")).length}명
                  </span>
                  <Button size="sm" onClick={addParticipant}>
                    <Plus className="w-4 h-4 mr-1" />행 추가
                  </Button>
                </div>

                <div className="max-h-96 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">순서</TableHead>
                        {textFields.map((field) => (
                          <TableHead key={field.id}>{field.name}</TableHead>
                        ))}
                        <TableHead className="w-24">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant, index) => (
                        <TableRow
                          key={participant.id}
                          className={Math.floor(index / tagsPerPageMemo.total) % 2 === 1 ? "bg-gray-50" : ""}
                        >
                          <TableCell className="text-center">
                            <div className="flex items-center gap-1">
                              <span className="text-sm">{index + 1}</span>
                              <div className="flex flex-col">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => moveParticipant(participant.id, "up")}
                                  disabled={index === 0}
                                  className="h-4 p-0"
                                >
                                  <MoveUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => moveParticipant(participant.id, "down")}
                                  disabled={index === participants.length - 1}
                                  className="h-4 p-0"
                                >
                                  <MoveDown className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                          {textFields.map((field) => (
                            <TableCell key={field.id}>
                              <Input
                                value={participant.data[field.name] || ""}
                                onChange={(e) => updateParticipantData(participant.id, field.name, e.target.value)}
                                placeholder={field.description}
                              />
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => removeParticipant(participant.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 출력 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>출력 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="paper">종이 크기</Label>
                <Select value={selectedPaper.name} onValueChange={handlePaperChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_SIZES.map((paper) => (
                      <SelectItem key={paper.name} value={paper.name}>
                        {paper.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paperWidth">가로 (mm)</Label>
                <Input
                  id="paperWidth"
                  type="number"
                  value={isCustomPaper ? customPaperWidth : selectedPaper.width}
                  onChange={(e) => setCustomPaperWidth(Number(e.target.value))}
                  disabled={!isCustomPaper}
                />
              </div>
              <div>
                <Label htmlFor="paperHeight">세로 (mm)</Label>
                <Input
                  id="paperHeight"
                  type="number"
                  value={isCustomPaper ? customPaperHeight : selectedPaper.height}
                  onChange={(e) => setCustomPaperHeight(Number(e.target.value))}
                  disabled={!isCustomPaper}
                />
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  <div>한 장당: {tagsPerPageMemo.total}개</div>
                  <div>
                    배치: {tagsPerPageMemo.cols} × {tagsPerPageMemo.rows}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "미리보기 숨기기" : "미리보기"}
              </Button>
              <Button onClick={handlePrint} className="flex items-center gap-2">
                출력하기
              </Button>
            </div>

            {/* 미리보기 섹션 */}
            {showPreview && (
              <div className="border rounded-lg p-4 bg-white">
                <h4 className="font-medium mb-4">출력 미리보기 (첫 페이지)</h4>
                <div className="overflow-auto max-h-96">
                  <div
                    className="border mx-auto bg-white relative"
                    style={{
                      width: `${Math.min(currentPaperSize.width * 1.5, 500)}px`,
                      height: `${Math.min(currentPaperSize.height * 1.5, 350)}px`,
                    }}
                  >
                    <div
                      className="grid gap-1 p-2 h-full"
                      style={{
                        gridTemplateColumns: `repeat(${tagsPerPageMemo.cols}, 1fr)`,
                        gridTemplateRows: `repeat(${tagsPerPageMemo.rows}, 1fr)`,
                      }}
                    >
                      {Array.from({ length: tagsPerPageMemo.total }).map((_, index) => {
                        // 기존 코드에서 participant 체크 부분을 제거하고 항상 레이아웃만 표시
                        {
                          const previewScale = Math.min(currentPaperSize.width * 1.5, 500) / currentPaperSize.width

                          return (
                            <div
                              key={index}
                              className="border border-gray-300 bg-white relative text-xs overflow-hidden"
                              style={{
                                backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
                                backgroundSize:
                                  backgroundFit === "cover"
                                    ? "cover"
                                    : backgroundFit === "contain"
                                      ? "contain"
                                      : backgroundFit === "fill"
                                        ? "100% 100%"
                                        : "auto",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                              }}
                            >
                              {textFields.map((field) => {
                                // 미리보기에서도 테두리 효과 적용
                                const textStyle: React.CSSProperties = {
                                  position: "absolute",
                                  left: `${field.x * previewScale}px`,
                                  top: `${(field.y - field.fontSize) * previewScale}px`,
                                  fontSize: `${field.fontSize * previewScale}px`,
                                  fontFamily: field.fontFamily,
                                  textAlign: field.textAlign,
                                  color: field.color,
                                  whiteSpace: "nowrap",
                                  transform:
                                    field.textAlign === "center"
                                      ? "translateX(-50%)"
                                      : field.textAlign === "right"
                                        ? "translateX(-100%)"
                                        : "none",
                                }

                                // 테두리가 있는 경우 -webkit-text-stroke 사용
                                if (field.strokeWidth > 0) {
                                  const strokeWidth = field.strokeWidth * previewScale
                                  const strokeColor = field.strokeColor
                                  textStyle.WebkitTextStroke = `${strokeWidth}px ${strokeColor}`
                                  textStyle.WebkitTextFillColor = field.color
                                }

                                return (
                                  <div key={field.id} className="text-gray-400" style={textStyle}>
                                    [{field.name}]
                                  </div>
                                )
                              })}
                              <div className="flex items-center justify-center h-full text-gray-400"></div>
                            </div>
                          )
                        }
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default NameTagGenerator
