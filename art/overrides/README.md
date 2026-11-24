# Hand-edited art

Put an SVG here at the same relative path as a generated one under
`public/assets/` and the game uses yours instead. For example:

    art/overrides/units/blue/knight/head.svg

replaces `public/assets/units/blue/knight/head.svg`.

`npm run art` never writes in this folder. Run it after adding or changing an
override so that the manifest's bounds are measured from your file.
