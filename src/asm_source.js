export const program = `
# Calling convention:
# caller saves: d, m
# callee saves: a, b, c
# caller cleans up the stack with 'eat'


.setup
    jmp %Game.main


namespace Game
    namespace Point
        def draw
            # stack: 2 (x y)
            psh c

            # c := y
            ofg c 3
            num m 16
            mul c m

            # m := x
            ofg m 4
            add c m

            num d 0xe0
            num m 1
            ser c d

            pop c
            ret
        namespace pop
    namespace pop


    namespace Player
        .x
            dat 8
        .y
            dat 8
    namespace pop


    private namespace Treasure
        .coordinates
            #   x    y
            dat 1    3
            dat 4    5
            dat 2    7
            dat 14   5
            dat 10   10
            dat 8    12
            dat 5    9
            dat 0xff 0xff

        def collides public
        use coordinates
        use $.Player.x as x
        use $.Player.y as y
            # return value: d
            psh a
            psh b
            psh c

            num c 0
            num a :coordinates
            num b coordinates:

            .loop
                # d := treasure.x
                ger a b
                mov d m
                # if d == 0xff: goto %fail
                inc d
                jiz %fail
                dec d

                # m := player.x
                gec %x

                # if m != d: goto next
                sub d m
                inl a b
                jnz %next


                # d := treasure.y
                ger a b
                mov d m

                # m := player.y
                gec %y

                # if m != d: goto next
                sub d m
                jnz %next

                mov d c
                jmp %ret
            .next
                inc c
                inl a b
                jmp %loop

            .fail
                num d 0xff
            .ret
            pop c
            pop b
            pop a
            ret
        namespace pop

        def remove public
        use coordinates
            # stack: 1 (index)
            psh a
            psh b
            psh c

            # plan:
            # 1. go to p = (coordinates + index*2)
            # 2. set *p = 0
            # 3. set *(p+1) = 0
            # 4. shift the rest of the treasures

            private namespace
            use coordinates
                # m := index
                ofg m 5

                num a :coordinates
                num b coordinates:

                .loop
                    inc m
                    dec m
                    jiz %loop_end
                        inl a b
                        inl a b
                        dec m
                    jmp %loop
                .loop_end
            # now [a, b] is the address of treasure.x
            namespace pop

            private namespace
                .loop
                    mov c a
                    mov d b
                    inl a b
                    inl a b

                    # m := new x
                    ger a b

                    ser c d
                    inl a b

                    inl c d
                    ger a b
                    ser c d

                    # if m == 0xff, goto %end:
                    inc m
                    jiz %loop_end
                    dec m

                    del a b
                    jmp %loop
                .loop_end
            namespace pop

            pop c
            pop b
            pop a
            ret
        namespace pop

        def draw public
        use coordinates
        use $.Point.draw
            # stack: 0 ()
            # modifies: a b c d m
            psh a
            psh b
            psh c

            num a :coordinates
            num b coordinates:
            .loop
                ger a b
                num d 0xff
                sub m d

                jiz %loop_end
                add m d

                psh m

                inl a b

                ger a b
                psh m

                clc %Point.draw
                eat 2

                inl a b
                jmp %loop

            .loop_end

            pop c
            pop b
            pop a
            ret
        namespace pop
    namespace pop


    namespace Screen
        def clear
            # stack: 0 ()
            psh a
            psh b
            psh c

            num b 0
            .by
                num a 0
                .ax
                    # c <- b*16 + a
                    mov c b
                    num d 16
                    mul c d
                    add c a

                    num m 0
                    num d 0xe0
                    ser c d

                    inc a
                    psh a
                    num d 16
                    sub a d
                    pop a
                    jnz %ax
                inc b
                psh b
                num d 16
                sub b d
                pop b
                jnz %by

            pop c
            pop b
            pop a
            ret
        namespace pop
    namespace pop


    def main public
    use Player.x as x
    use Player.y as y
    use Screen.clear
    use Treasure.draw
    use Treasure.collides
    use Treasure.remove
    use Point.draw
        psh a
        psh b
        psh c

        clc %Screen.clear
        clc %Treasure.draw

        private namespace
        use Treasure.remove
        use Treasure.collides
            clc %Treasure.collides

            # if d == 0xff, no collision
            inc d
            jiz %not_found
            dec d

            psh d
            clc %Treasure.remove
            eat 1

            .not_found
        namespace pop

        gec %x
        mov a m

        gec %y
        num b 16
        mul b m
        add a b

        num m 2
        num b 0xe0
        ser a b

        private namespace on_left_button
        use x
            gec 0x00 0xe1
            add m m
            jiz %skip
                gec %x
                dec m
                jic %skip
                    sec %x
            .skip
        namespace pop

        private namespace on_right_button
        use x
            gec 0x01 0xe1
            add m m
            jiz %skip
                gec %x
                inc m

                psh m
                num d 16
                sub m d
                pop m
                jiz %skip
                    sec %x
            .skip
        namespace pop

        private namespace on_up_button
        use y
            gec 0x02 0xe1
            add m m
            jiz %skip
                gec %y
                dec m
                jic %skip
                    sec %y
            .skip
        namespace pop

        private namespace on_up_button
        use y
            gec 0x03 0xe1
            add m m
            jiz %skip
                gec %y
                inc m

                psh m
                num d 16
                sub m d
                pop m
                jiz %skip
                    sec %y
            .skip
        namespace pop

        pop c
        pop b
        pop a
        hlt
    namespace pop
namespace pop
`;