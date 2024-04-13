global _start

section .data
	align 16
controlword:
	dw 0
dwordmxcsr:
	dw 0
dword0:
	dd	1000.0
dword1:
	dd	5.0
dword2:
	dd	3000.0
dwSNaN:
	dd	__SNaN__
dwQNaN:
	dd	__QNaN__

; Moves EFLAGS into specified register
%macro moveflags 1
	pushf
	and			dword [esp], 0x45
	pop			eax
	movd		%1, eax
%endmacro

%include "header.inc"

	movd		xmm0, [dword0]
	; Equal
	ucomiss		xmm0, [dword0]
	moveflags	mm0				; [ZF] = 100000
	; Less than
	ucomiss		xmm0, [dword1]
	moveflags	mm1				; [CF] = 000001
	; Greater than
	ucomiss		xmm0, [dword2]
	moveflags	mm2				; [] = 000000

	; Unordered: Quiet NaN
	movd		xmm1, [dwQNaN]
	ucomiss		xmm0, xmm1
	moveflags	mm3				; [ZF][PF][CF] = 100101
	; Check #I exception
	stmxcsr		[dwordmxcsr]
	movd		mm4, [dwordmxcsr]

	; Unordered: Signaling NaN
	movd		xmm1, [dwSNaN]
	ucomiss		xmm0, xmm1
	moveflags	mm5				; [ZF][PF][CF] = 100101
	; Check #I exception
	stmxcsr		[dwordmxcsr]
	movd		mm6, [dwordmxcsr]

%include "footer.inc"
