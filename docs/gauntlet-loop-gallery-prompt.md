Make our Steam-style dashboard at localhost:5173 handle showcase galleries and level progression the way a real Steam profile does.

The bar is a real Steam profile page — fetch it with a browser at the same viewport and compare against it directly. Take the actual hexagons.png and shields.png level art from Steam's stylesheet rather than guessing at it, and read Steam's showcase screenshot hover rules from profile.css so the caption bar and zoom match.

Break this into the smallest pieces that can be judged on their own - gallery rows with their own prev-next scope, caption on hover, badge tier art past level 100, header current-game line, card hover zoom, and mobile down to 375px. For each piece, fan out a builder and a separate critic with fresh context. The critic inspects the actual rendered page, puts ours next to Steam's blind with the labels stripped, says which one is better, and names the single biggest remaining gap. Then it goes back to the builder.

The critic should be a harsh critic. Praise is not useful. If ours does not win, it keeps going.

Keep looping until the critic picks ours blind. Do not stop before that.

Keep a live progress page updating as the work evolves so I can watch it.

Keep looping until the critic picks ours. Run the builders and critics as parallel subagents.
