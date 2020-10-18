export const program = `
.setup
    jmp %main


namespace Point
    sub draw
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


namespace Treasure
    .coordinates
        # x y
        dat 1    3
        dat 2    7
        dat 14   5
        dat 8    12
        dat 0xff

    sub draw
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
            jmp :loop loop:

        .loop_end

        ret
    namespace pop
namespace pop


namespace Player
    .x
        dat 0
    .y
        dat 0
namespace pop


namespace Screen
    sub clear
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
                jnz :ax ax:
            inc b
            psh b
            num d 16
            sub b d
            pop b
            jnz :by by:
        ret
    namespace pop
namespace pop


sub main
use Player.x as x
use Player.y as y
    clc %*.Screen.clear
    clc %*.Treasure.draw

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
                sec :x x:
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
`;