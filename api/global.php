<?php

$commands = [
    ":shrug:" => "¯\\_(ツ)_/¯",
    ":heart:" => "♥",
    ":heart2:" => "❤",
    ":uwu:" => "(✿◡‿◡)",
    ":owo:" => "＼（〇_ｏ）／",
    ":twt:" => "〒▽〒",
    ":tableflip:" => "(╯°□°）╯︵ ┻━┻",
    ":unflip:" => "┬─┬ノ( º _ ºノ)",
    ":rick:" => "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ":sus:" => "ඞ",
    ":face:" => "👁👄👁",
    ":crown:" => "👑",
    ":sparkle:" => "✨",
    "genshin" => "genshit",
    "Genshin" => "Genshrek",
    "genshit impact" => "gayshit infect" 
];

$typeMask = [
    "admin" => "oldmartijntje",
    "visualAdmin" => "oldmartijntje"
];

function checkForCommands($input) {
    global $commands;

    foreach ($commands as $command => $replacement) {
        if (strpos($input, $command) !== false) {
            // Replace the command with its corresponding value
            $input = str_replace($command, $replacement, $input);
        }
    }

    return $input;
}

function applyMask($input) {
    global $typeMask;

    if (isset($typeMask[$input])) {
        return $typeMask[$input];
    } else {
        return $input;
    }
}

?>