global _start

%include "header.inc"

    lea ebp, [esp+10h]
    mov dword [ebp], 123456789
    leave

%include "footer.inc"
