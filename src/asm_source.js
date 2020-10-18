export const program = `
.setup
    jmp %Game.main


private namespace Game
    namespace Point
        def draw
            # stack: 2 (x y)
            # modifies: c d m

            # stack[2] = y
            ofg c 2
            num m 16
            mul c m

            # stack[3] = x
            ofg m 3
            add c m

            num d 0xe0
            num m 1
            ser c d
            ret
        namespace pop
    namespace pop


    private namespace Treasure
        .coordinates
            # x y
            dat 1    3
            dat 2    7
            dat 14   5
            dat 8    12
            dat 0xff

        def remove public
        use coordinates
            # stack: 1 (index)
            # modifies: m
            psh a
            psh b

            # plan:
            # 1. go to p = (coordinates + index*2)
            # 2. set *p = 0
            # 3. set *(p+1) = 0

            # c := index
            ofg m 4

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

            num m 0
            ser a b
            inl a b
            ser a b

            pop b
            pop a

            ret
        namespace pop

        def draw public
        use coordinates
        use $.Point.draw
            # stack: 0 ()
            # modifies: a b c d m

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

            ret
        namespace pop
    namespace pop


    namespace Player
        .x
            dat 8
        .y
            dat 8
    namespace pop


    namespace Screen
        def clear
            # stack: 0 ()
            # modifies: a b c d m

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
            ret
        namespace pop
    namespace pop


    def main public
    use Player.x as x
    use Player.y as y
    use Screen.clear
    use Treasure.draw
    use Treasure.remove
        num m 0
        psh m
        clc %Treasure.remove
        eat 1

        clc %Screen.clear
        clc %Treasure.draw

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

        hlt
    namespace pop
namespace pop
`;