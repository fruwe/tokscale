use ratatui::style::Color;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThemeName {
    Green,
    Halloween,
    Teal,
    Blue,
    TokyoNight,
    Catppuccin,
    Solarized,
    Gruvbox,
    OneDark,
    Gtuvbox,
    Pink,
    Purple,
    Orange,
    Monochrome,
    YlGnBu,
}

impl ThemeName {
    pub fn all() -> &'static [ThemeName] {
        &[
            ThemeName::Green,
            ThemeName::Halloween,
            ThemeName::Teal,
            ThemeName::Blue,
            ThemeName::TokyoNight,
            ThemeName::Catppuccin,
            ThemeName::Solarized,
            ThemeName::Gruvbox,
            ThemeName::OneDark,
            ThemeName::Gtuvbox,
            ThemeName::Pink,
            ThemeName::Purple,
            ThemeName::Orange,
            ThemeName::Monochrome,
            ThemeName::YlGnBu,
        ]
    }

    pub fn next(self) -> ThemeName {
        let themes = Self::all();
        let idx = themes.iter().position(|&t| t == self).unwrap_or(0);
        themes[(idx + 1) % themes.len()]
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            ThemeName::Green => "green",
            ThemeName::Halloween => "halloween",
            ThemeName::Teal => "teal",
            ThemeName::Blue => "blue",
            ThemeName::TokyoNight => "tokyo-night",
            ThemeName::Catppuccin => "catppuccin",
            ThemeName::Solarized => "solarized",
            ThemeName::Gruvbox => "gruvbox",
            ThemeName::OneDark => "one-dark",
            ThemeName::Gtuvbox => "gtuvbox",
            ThemeName::Pink => "pink",
            ThemeName::Purple => "purple",
            ThemeName::Orange => "orange",
            ThemeName::Monochrome => "monochrome",
            ThemeName::YlGnBu => "ylgnbu",
        }
    }
}

impl std::str::FromStr for ThemeName {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "green" => Ok(ThemeName::Green),
            "halloween" => Ok(ThemeName::Halloween),
            "teal" => Ok(ThemeName::Teal),
            "blue" => Ok(ThemeName::Blue),
            "tokyo-night" => Ok(ThemeName::TokyoNight),
            "catppuccin" => Ok(ThemeName::Catppuccin),
            "solarized" => Ok(ThemeName::Solarized),
            "gruvbox" => Ok(ThemeName::Gruvbox),
            "one-dark" => Ok(ThemeName::OneDark),
            "gtuvbox" => Ok(ThemeName::Gtuvbox),
            "pink" => Ok(ThemeName::Pink),
            "purple" => Ok(ThemeName::Purple),
            "orange" => Ok(ThemeName::Orange),
            "monochrome" => Ok(ThemeName::Monochrome),
            "ylgnbu" => Ok(ThemeName::YlGnBu),
            _ => Err(()),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Theme {
    pub name: ThemeName,
    pub colors: [Color; 5],
    pub background: Color,
    pub foreground: Color,
    pub border: Color,
    pub highlight: Color,
    pub muted: Color,
    pub accent: Color,
    pub selection: Color,
    pub success: Color,
    pub info: Color,
    pub warning: Color,
    pub token_input: Color,
    pub token_output: Color,
    pub token_cache_read: Color,
    pub token_cache_write: Color,
    pub shortcut_sort: Color,
    pub shortcut_theme: Color,
    pub stripe: Color,
    pub today: Color,
}

impl Theme {
    pub fn from_name(name: ThemeName) -> Self {
        let colors = match name {
            // Colors match frontend contribution graph palettes (higher grade = darker = more activity)
            ThemeName::Green => [
                Color::Rgb(22, 27, 34),    // grade0: empty
                Color::Rgb(155, 233, 168), // grade1: #9be9a8
                Color::Rgb(64, 196, 99),   // grade2: #40c463
                Color::Rgb(48, 161, 78),   // grade3: #30a14e
                Color::Rgb(33, 110, 57),   // grade4: #216e39
            ],
            ThemeName::Halloween => [
                Color::Rgb(22, 27, 34),   // grade0: empty
                Color::Rgb(255, 238, 74), // grade1: #FFEE4A
                Color::Rgb(255, 197, 1),  // grade2: #FFC501
                Color::Rgb(254, 150, 0),  // grade3: #FE9600
                Color::Rgb(3, 0, 28),     // grade4: #03001C
            ],
            ThemeName::Teal => [
                Color::Rgb(22, 27, 34),    // grade0: empty
                Color::Rgb(126, 229, 229), // grade1: #7ee5e5
                Color::Rgb(45, 197, 197),  // grade2: #2dc5c5
                Color::Rgb(13, 158, 158),  // grade3: #0d9e9e
                Color::Rgb(14, 109, 109),  // grade4: #0e6d6d
            ],
            ThemeName::Blue => [
                Color::Rgb(22, 27, 34),    // grade0: empty
                Color::Rgb(121, 184, 255), // grade1: #79b8ff
                Color::Rgb(56, 139, 253),  // grade2: #388bfd
                Color::Rgb(31, 111, 235),  // grade3: #1f6feb
                Color::Rgb(13, 65, 157),   // grade4: #0d419d
            ],
            ThemeName::TokyoNight => [
                Color::Rgb(36, 40, 59),    // grade0
                Color::Rgb(125, 207, 255), // grade1
                Color::Rgb(122, 162, 247), // grade2
                Color::Rgb(187, 154, 247), // grade3
                Color::Rgb(247, 118, 142), // grade4
            ],
            ThemeName::Catppuccin => [
                Color::Rgb(49, 50, 68),    // grade0
                Color::Rgb(166, 227, 161), // grade1
                Color::Rgb(137, 180, 250), // grade2
                Color::Rgb(203, 166, 247), // grade3
                Color::Rgb(243, 139, 168), // grade4
            ],
            ThemeName::Solarized => [
                Color::Rgb(7, 54, 66),    // grade0
                Color::Rgb(42, 161, 152), // grade1
                Color::Rgb(38, 139, 210), // grade2
                Color::Rgb(181, 137, 0),  // grade3
                Color::Rgb(220, 50, 47),  // grade4
            ],
            ThemeName::Gruvbox => [
                Color::Rgb(50, 48, 47),    // grade0
                Color::Rgb(142, 192, 124), // grade1
                Color::Rgb(131, 165, 152), // grade2
                Color::Rgb(250, 189, 47),  // grade3
                Color::Rgb(251, 73, 52),   // grade4
            ],
            ThemeName::OneDark => [
                Color::Rgb(40, 44, 52),    // grade0
                Color::Rgb(152, 195, 121), // grade1
                Color::Rgb(97, 175, 239),  // grade2
                Color::Rgb(198, 120, 221), // grade3
                Color::Rgb(224, 108, 117), // grade4
            ],
            ThemeName::Gtuvbox => [
                Color::Rgb(40, 40, 40),   // grade0: empty
                Color::Rgb(184, 187, 38), // grade1: #b8bb26
                Color::Rgb(250, 189, 47), // grade2: #fabd2f
                Color::Rgb(215, 153, 33), // grade3: #d79921
                Color::Rgb(251, 73, 52),  // grade4: #fb4934
            ],
            ThemeName::Pink => [
                Color::Rgb(22, 27, 34),    // grade0: empty
                Color::Rgb(240, 181, 210), // grade1: #f0b5d2
                Color::Rgb(217, 97, 160),  // grade2: #d961a0
                Color::Rgb(191, 75, 138),  // grade3: #bf4b8a
                Color::Rgb(153, 40, 110),  // grade4: #99286e
            ],
            ThemeName::Purple => [
                Color::Rgb(22, 27, 34),    // grade0: empty
                Color::Rgb(205, 180, 255), // grade1: #cdb4ff
                Color::Rgb(163, 113, 247), // grade2: #a371f7
                Color::Rgb(137, 87, 229),  // grade3: #8957e5
                Color::Rgb(110, 64, 201),  // grade4: #6e40c9
            ],
            ThemeName::Orange => [
                Color::Rgb(22, 27, 34),    // grade0: empty
                Color::Rgb(255, 214, 153), // grade1: #ffd699
                Color::Rgb(255, 179, 71),  // grade2: #ffb347
                Color::Rgb(255, 140, 0),   // grade3: #ff8c00
                Color::Rgb(204, 85, 0),    // grade4: #cc5500
            ],
            ThemeName::Monochrome => [
                Color::Rgb(22, 27, 34),    // grade0: empty
                Color::Rgb(158, 158, 158), // grade1: #9e9e9e
                Color::Rgb(117, 117, 117), // grade2: #757575
                Color::Rgb(66, 66, 66),    // grade3: #424242
                Color::Rgb(33, 33, 33),    // grade4: #212121
            ],
            ThemeName::YlGnBu => [
                Color::Rgb(22, 27, 34),    // grade0: empty
                Color::Rgb(161, 218, 180), // grade1: #a1dab4
                Color::Rgb(65, 182, 196),  // grade2: #41b6c4
                Color::Rgb(44, 127, 184),  // grade3: #2c7fb8
                Color::Rgb(37, 52, 148),   // grade4: #253494
            ],
        };

        let (
            background,
            foreground,
            border,
            muted,
            accent,
            selection,
            success,
            info,
            warning,
            token_input,
            token_output,
            token_cache_read,
            token_cache_write,
            shortcut_sort,
            shortcut_theme,
            stripe,
            today,
        ) = match name {
            ThemeName::Gtuvbox => (
                Color::Rgb(50, 48, 47),    // #32302f
                Color::Rgb(235, 219, 178), // #ebdbb2
                Color::Rgb(102, 92, 84),   // #665c54
                Color::Rgb(168, 153, 132), // #a89984
                Color::Rgb(215, 153, 33),  // #d79921
                Color::Rgb(80, 73, 69),    // #504945
                Color::Rgb(184, 187, 38),  // #b8bb26
                Color::Rgb(131, 165, 152), // #83a598
                Color::Rgb(250, 189, 47),  // #fabd2f
                Color::Rgb(184, 187, 38),  // token_input
                Color::Rgb(251, 73, 52),   // token_output
                Color::Rgb(131, 165, 152), // token_cache_read
                Color::Rgb(215, 153, 33),  // token_cache_write
                Color::Rgb(131, 165, 152), // shortcut_sort
                Color::Rgb(250, 189, 47),  // shortcut_theme
                Color::Rgb(60, 56, 54),    // #3c3836
                Color::Rgb(69, 133, 136),  // #458588
            ),
            ThemeName::TokyoNight => (
                Color::Rgb(26, 27, 38),    // #1a1b26
                Color::Rgb(192, 202, 245), // #c0caf5
                Color::Rgb(65, 72, 104),   // #414868
                Color::Rgb(86, 95, 137),   // #565f89
                Color::Rgb(187, 154, 247), // #bb9af7
                Color::Rgb(41, 46, 66),    // #292e42
                Color::Rgb(158, 206, 106), // #9ece6a
                Color::Rgb(125, 207, 255), // #7dcfff
                Color::Rgb(224, 175, 104), // #e0af68
                Color::Rgb(158, 206, 106), // token_input
                Color::Rgb(247, 118, 142), // token_output
                Color::Rgb(125, 207, 255), // token_cache_read
                Color::Rgb(224, 175, 104), // token_cache_write
                Color::Rgb(122, 162, 247), // shortcut_sort
                Color::Rgb(187, 154, 247), // shortcut_theme
                Color::Rgb(31, 35, 53),    // stripe
                Color::Rgb(45, 74, 102),   // today
            ),
            ThemeName::Catppuccin => (
                Color::Rgb(30, 30, 46),    // #1e1e2e
                Color::Rgb(205, 214, 244), // #cdd6f4
                Color::Rgb(88, 91, 112),   // #585b70
                Color::Rgb(166, 173, 200), // #a6adc8
                Color::Rgb(203, 166, 247), // #cba6f7
                Color::Rgb(69, 71, 90),    // #45475a
                Color::Rgb(166, 227, 161), // #a6e3a1
                Color::Rgb(137, 180, 250), // #89b4fa
                Color::Rgb(249, 226, 175), // #f9e2af
                Color::Rgb(166, 227, 161), // token_input
                Color::Rgb(243, 139, 168), // token_output
                Color::Rgb(137, 180, 250), // token_cache_read
                Color::Rgb(249, 226, 175), // token_cache_write
                Color::Rgb(137, 180, 250), // shortcut_sort
                Color::Rgb(203, 166, 247), // shortcut_theme
                Color::Rgb(49, 50, 68),    // stripe
                Color::Rgb(69, 71, 90),    // today
            ),
            ThemeName::Solarized => (
                Color::Rgb(0, 43, 54),     // #002b36
                Color::Rgb(147, 161, 161), // #93a1a1
                Color::Rgb(88, 110, 117),  // #586e75
                Color::Rgb(101, 123, 131), // #657b83
                Color::Rgb(181, 137, 0),   // #b58900
                Color::Rgb(7, 54, 66),     // #073642
                Color::Rgb(133, 153, 0),   // #859900
                Color::Rgb(38, 139, 210),  // #268bd2
                Color::Rgb(203, 75, 22),   // #cb4b16
                Color::Rgb(133, 153, 0),   // token_input
                Color::Rgb(220, 50, 47),   // token_output
                Color::Rgb(38, 139, 210),  // token_cache_read
                Color::Rgb(203, 75, 22),   // token_cache_write
                Color::Rgb(38, 139, 210),  // shortcut_sort
                Color::Rgb(181, 137, 0),   // shortcut_theme
                Color::Rgb(0, 52, 65),     // stripe
                Color::Rgb(7, 54, 66),     // today
            ),
            ThemeName::Gruvbox => (
                Color::Rgb(40, 40, 40),    // #282828
                Color::Rgb(235, 219, 178), // #ebdbb2
                Color::Rgb(102, 92, 84),   // #665c54
                Color::Rgb(168, 153, 132), // #a89984
                Color::Rgb(250, 189, 47),  // #fabd2f
                Color::Rgb(60, 56, 54),    // #3c3836
                Color::Rgb(142, 192, 124), // #8ec07c
                Color::Rgb(131, 165, 152), // #83a598
                Color::Rgb(250, 189, 47),  // #fabd2f
                Color::Rgb(142, 192, 124), // token_input
                Color::Rgb(251, 73, 52),   // token_output
                Color::Rgb(131, 165, 152), // token_cache_read
                Color::Rgb(250, 189, 47),  // token_cache_write
                Color::Rgb(131, 165, 152), // shortcut_sort
                Color::Rgb(250, 189, 47),  // shortcut_theme
                Color::Rgb(50, 48, 47),    // stripe
                Color::Rgb(69, 133, 136),  // today
            ),
            ThemeName::OneDark => (
                Color::Rgb(40, 44, 52),    // #282c34
                Color::Rgb(171, 178, 191), // #abb2bf
                Color::Rgb(92, 99, 112),   // #5c6370
                Color::Rgb(130, 137, 151), // #828997
                Color::Rgb(97, 175, 239),  // #61afef
                Color::Rgb(62, 68, 81),    // #3e4451
                Color::Rgb(152, 195, 121), // #98c379
                Color::Rgb(97, 175, 239),  // #61afef
                Color::Rgb(229, 192, 123), // #e5c07b
                Color::Rgb(152, 195, 121), // token_input
                Color::Rgb(224, 108, 117), // token_output
                Color::Rgb(97, 175, 239),  // token_cache_read
                Color::Rgb(229, 192, 123), // token_cache_write
                Color::Rgb(97, 175, 239),  // shortcut_sort
                Color::Rgb(198, 120, 221), // shortcut_theme
                Color::Rgb(44, 49, 58),    // stripe
                Color::Rgb(58, 73, 94),    // today
            ),
            ThemeName::Green => (
                Color::Rgb(13, 31, 23),
                Color::Rgb(210, 235, 217),
                Color::Rgb(48, 86, 61),
                Color::Rgb(116, 150, 126),
                Color::Rgb(64, 196, 99),
                Color::Rgb(26, 48, 34),
                Color::Rgb(64, 196, 99),
                Color::Rgb(126, 229, 229),
                Color::Rgb(155, 233, 168),
                Color::Rgb(155, 233, 168),
                Color::Rgb(64, 196, 99),
                Color::Rgb(126, 229, 229),
                Color::Rgb(48, 161, 78),
                Color::Rgb(126, 229, 229),
                Color::Rgb(64, 196, 99),
                Color::Rgb(16, 36, 26),
                Color::Rgb(24, 52, 36),
            ),
            ThemeName::Halloween => (
                Color::Rgb(33, 19, 8),
                Color::Rgb(255, 230, 179),
                Color::Rgb(102, 64, 12),
                Color::Rgb(184, 145, 93),
                Color::Rgb(254, 150, 0),
                Color::Rgb(58, 35, 10),
                Color::Rgb(255, 197, 1),
                Color::Rgb(255, 238, 74),
                Color::Rgb(254, 150, 0),
                Color::Rgb(255, 238, 74),
                Color::Rgb(254, 150, 0),
                Color::Rgb(255, 197, 1),
                Color::Rgb(255, 238, 74),
                Color::Rgb(255, 197, 1),
                Color::Rgb(254, 150, 0),
                Color::Rgb(40, 24, 9),
                Color::Rgb(58, 32, 10),
            ),
            ThemeName::Teal => (
                Color::Rgb(10, 29, 29),
                Color::Rgb(210, 240, 240),
                Color::Rgb(32, 83, 83),
                Color::Rgb(103, 156, 156),
                Color::Rgb(45, 197, 197),
                Color::Rgb(18, 46, 46),
                Color::Rgb(45, 197, 197),
                Color::Rgb(126, 229, 229),
                Color::Rgb(13, 158, 158),
                Color::Rgb(126, 229, 229),
                Color::Rgb(13, 158, 158),
                Color::Rgb(45, 197, 197),
                Color::Rgb(14, 109, 109),
                Color::Rgb(126, 229, 229),
                Color::Rgb(45, 197, 197),
                Color::Rgb(12, 35, 35),
                Color::Rgb(16, 49, 49),
            ),
            ThemeName::Blue => (
                Color::Rgb(11, 24, 39),
                Color::Rgb(214, 228, 245),
                Color::Rgb(32, 63, 102),
                Color::Rgb(109, 137, 178),
                Color::Rgb(56, 139, 253),
                Color::Rgb(18, 37, 60),
                Color::Rgb(56, 139, 253),
                Color::Rgb(121, 184, 255),
                Color::Rgb(31, 111, 235),
                Color::Rgb(121, 184, 255),
                Color::Rgb(31, 111, 235),
                Color::Rgb(56, 139, 253),
                Color::Rgb(13, 65, 157),
                Color::Rgb(121, 184, 255),
                Color::Rgb(56, 139, 253),
                Color::Rgb(13, 29, 46),
                Color::Rgb(17, 41, 66),
            ),
            ThemeName::Pink => (
                Color::Rgb(36, 18, 29),
                Color::Rgb(246, 219, 233),
                Color::Rgb(110, 64, 94),
                Color::Rgb(181, 131, 160),
                Color::Rgb(217, 97, 160),
                Color::Rgb(58, 29, 46),
                Color::Rgb(240, 181, 210),
                Color::Rgb(217, 97, 160),
                Color::Rgb(191, 75, 138),
                Color::Rgb(240, 181, 210),
                Color::Rgb(191, 75, 138),
                Color::Rgb(217, 97, 160),
                Color::Rgb(153, 40, 110),
                Color::Rgb(240, 181, 210),
                Color::Rgb(217, 97, 160),
                Color::Rgb(44, 22, 36),
                Color::Rgb(62, 31, 49),
            ),
            ThemeName::Purple => (
                Color::Rgb(23, 18, 38),
                Color::Rgb(229, 220, 247),
                Color::Rgb(71, 55, 112),
                Color::Rgb(152, 135, 194),
                Color::Rgb(163, 113, 247),
                Color::Rgb(37, 29, 58),
                Color::Rgb(205, 180, 255),
                Color::Rgb(163, 113, 247),
                Color::Rgb(137, 87, 229),
                Color::Rgb(205, 180, 255),
                Color::Rgb(137, 87, 229),
                Color::Rgb(163, 113, 247),
                Color::Rgb(110, 64, 201),
                Color::Rgb(205, 180, 255),
                Color::Rgb(163, 113, 247),
                Color::Rgb(29, 23, 48),
                Color::Rgb(41, 32, 66),
            ),
            ThemeName::Orange => (
                Color::Rgb(38, 23, 11),
                Color::Rgb(247, 228, 209),
                Color::Rgb(116, 71, 29),
                Color::Rgb(189, 146, 109),
                Color::Rgb(255, 140, 0),
                Color::Rgb(60, 36, 16),
                Color::Rgb(255, 179, 71),
                Color::Rgb(255, 214, 153),
                Color::Rgb(255, 140, 0),
                Color::Rgb(255, 214, 153),
                Color::Rgb(255, 140, 0),
                Color::Rgb(255, 179, 71),
                Color::Rgb(204, 85, 0),
                Color::Rgb(255, 214, 153),
                Color::Rgb(255, 140, 0),
                Color::Rgb(45, 28, 12),
                Color::Rgb(65, 39, 17),
            ),
            ThemeName::Monochrome => (
                Color::Rgb(20, 20, 20),
                Color::Rgb(224, 224, 224),
                Color::Rgb(74, 74, 74),
                Color::Rgb(145, 145, 145),
                Color::Rgb(158, 158, 158),
                Color::Rgb(43, 43, 43),
                Color::Rgb(158, 158, 158),
                Color::Rgb(117, 117, 117),
                Color::Rgb(66, 66, 66),
                Color::Rgb(158, 158, 158),
                Color::Rgb(117, 117, 117),
                Color::Rgb(117, 117, 117),
                Color::Rgb(66, 66, 66),
                Color::Rgb(158, 158, 158),
                Color::Rgb(117, 117, 117),
                Color::Rgb(27, 27, 27),
                Color::Rgb(37, 37, 37),
            ),
            ThemeName::YlGnBu => (
                Color::Rgb(14, 24, 30),
                Color::Rgb(219, 236, 230),
                Color::Rgb(43, 86, 106),
                Color::Rgb(125, 170, 180),
                Color::Rgb(65, 182, 196),
                Color::Rgb(22, 42, 54),
                Color::Rgb(161, 218, 180),
                Color::Rgb(65, 182, 196),
                Color::Rgb(44, 127, 184),
                Color::Rgb(161, 218, 180),
                Color::Rgb(44, 127, 184),
                Color::Rgb(65, 182, 196),
                Color::Rgb(37, 52, 148),
                Color::Rgb(161, 218, 180),
                Color::Rgb(65, 182, 196),
                Color::Rgb(17, 31, 39),
                Color::Rgb(26, 51, 64),
            ),
        };

        Self {
            name,
            colors,
            background,
            foreground,
            border,
            highlight: colors[4],
            muted,
            accent,
            selection,
            success,
            info,
            warning,
            token_input,
            token_output,
            token_cache_read,
            token_cache_write,
            shortcut_sort,
            shortcut_theme,
            stripe,
            today,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{Theme, ThemeName};
    use ratatui::style::Color;
    use std::str::FromStr;

    #[test]
    fn gtuvbox_theme_name_round_trips() {
        assert_eq!(ThemeName::from_str("gtuvbox"), Ok(ThemeName::Gtuvbox));
        assert_eq!(ThemeName::Gtuvbox.as_str(), "gtuvbox");
    }

    #[test]
    fn gtuvbox_theme_is_listed() {
        assert!(ThemeName::all().contains(&ThemeName::Gtuvbox));
    }

    #[test]
    fn new_theme_names_round_trip() {
        assert_eq!(
            ThemeName::from_str("tokyo-night"),
            Ok(ThemeName::TokyoNight)
        );
        assert_eq!(ThemeName::TokyoNight.as_str(), "tokyo-night");

        assert_eq!(ThemeName::from_str("catppuccin"), Ok(ThemeName::Catppuccin));
        assert_eq!(ThemeName::Catppuccin.as_str(), "catppuccin");

        assert_eq!(ThemeName::from_str("solarized"), Ok(ThemeName::Solarized));
        assert_eq!(ThemeName::Solarized.as_str(), "solarized");

        assert_eq!(ThemeName::from_str("gruvbox"), Ok(ThemeName::Gruvbox));
        assert_eq!(ThemeName::Gruvbox.as_str(), "gruvbox");

        assert_eq!(ThemeName::from_str("one-dark"), Ok(ThemeName::OneDark));
        assert_eq!(ThemeName::OneDark.as_str(), "one-dark");
    }

    #[test]
    fn new_themes_are_listed() {
        let themes = ThemeName::all();

        assert!(themes.contains(&ThemeName::TokyoNight));
        assert!(themes.contains(&ThemeName::Catppuccin));
        assert!(themes.contains(&ThemeName::Solarized));
        assert!(themes.contains(&ThemeName::Gruvbox));
        assert!(themes.contains(&ThemeName::OneDark));
    }

    #[test]
    fn new_themes_use_expected_colors() {
        let tokyo_night = Theme::from_name(ThemeName::TokyoNight);
        assert_eq!(tokyo_night.colors[1], Color::Rgb(125, 207, 255));
        assert_eq!(tokyo_night.background, Color::Rgb(26, 27, 38));
        assert_eq!(tokyo_night.accent, Color::Rgb(187, 154, 247));
        assert_eq!(tokyo_night.token_input, Color::Rgb(158, 206, 106));
        assert_eq!(tokyo_night.token_output, Color::Rgb(247, 118, 142));
        assert_eq!(tokyo_night.token_cache_read, Color::Rgb(125, 207, 255));
        assert_eq!(tokyo_night.token_cache_write, Color::Rgb(224, 175, 104));
        assert_eq!(tokyo_night.shortcut_sort, Color::Rgb(122, 162, 247));
        assert_eq!(tokyo_night.shortcut_theme, Color::Rgb(187, 154, 247));
        assert_eq!(tokyo_night.success, Color::Rgb(158, 206, 106));

        let catppuccin = Theme::from_name(ThemeName::Catppuccin);
        assert_eq!(catppuccin.colors[1], Color::Rgb(166, 227, 161));
        assert_eq!(catppuccin.background, Color::Rgb(30, 30, 46));
        assert_eq!(catppuccin.accent, Color::Rgb(203, 166, 247));
        assert_eq!(catppuccin.token_input, Color::Rgb(166, 227, 161));
        assert_eq!(catppuccin.token_output, Color::Rgb(243, 139, 168));
        assert_eq!(catppuccin.token_cache_read, Color::Rgb(137, 180, 250));
        assert_eq!(catppuccin.token_cache_write, Color::Rgb(249, 226, 175));
        assert_eq!(catppuccin.shortcut_sort, Color::Rgb(137, 180, 250));
        assert_eq!(catppuccin.shortcut_theme, Color::Rgb(203, 166, 247));
        assert_eq!(catppuccin.success, Color::Rgb(166, 227, 161));

        let solarized = Theme::from_name(ThemeName::Solarized);
        assert_eq!(solarized.colors[1], Color::Rgb(42, 161, 152));
        assert_eq!(solarized.background, Color::Rgb(0, 43, 54));
        assert_eq!(solarized.accent, Color::Rgb(181, 137, 0));
        assert_eq!(solarized.token_input, Color::Rgb(133, 153, 0));
        assert_eq!(solarized.token_output, Color::Rgb(220, 50, 47));
        assert_eq!(solarized.token_cache_read, Color::Rgb(38, 139, 210));
        assert_eq!(solarized.token_cache_write, Color::Rgb(203, 75, 22));
        assert_eq!(solarized.shortcut_sort, Color::Rgb(38, 139, 210));
        assert_eq!(solarized.shortcut_theme, Color::Rgb(181, 137, 0));
        assert_eq!(solarized.success, Color::Rgb(133, 153, 0));

        let gruvbox = Theme::from_name(ThemeName::Gruvbox);
        assert_eq!(gruvbox.colors[1], Color::Rgb(142, 192, 124));
        assert_eq!(gruvbox.background, Color::Rgb(40, 40, 40));
        assert_eq!(gruvbox.accent, Color::Rgb(250, 189, 47));
        assert_eq!(gruvbox.token_input, Color::Rgb(142, 192, 124));
        assert_eq!(gruvbox.token_output, Color::Rgb(251, 73, 52));
        assert_eq!(gruvbox.token_cache_read, Color::Rgb(131, 165, 152));
        assert_eq!(gruvbox.token_cache_write, Color::Rgb(250, 189, 47));
        assert_eq!(gruvbox.shortcut_sort, Color::Rgb(131, 165, 152));
        assert_eq!(gruvbox.shortcut_theme, Color::Rgb(250, 189, 47));
        assert_eq!(gruvbox.success, Color::Rgb(142, 192, 124));

        let one_dark = Theme::from_name(ThemeName::OneDark);
        assert_eq!(one_dark.colors[1], Color::Rgb(152, 195, 121));
        assert_eq!(one_dark.background, Color::Rgb(40, 44, 52));
        assert_eq!(one_dark.accent, Color::Rgb(97, 175, 239));
        assert_eq!(one_dark.token_input, Color::Rgb(152, 195, 121));
        assert_eq!(one_dark.token_output, Color::Rgb(224, 108, 117));
        assert_eq!(one_dark.token_cache_read, Color::Rgb(97, 175, 239));
        assert_eq!(one_dark.token_cache_write, Color::Rgb(229, 192, 123));
        assert_eq!(one_dark.shortcut_sort, Color::Rgb(97, 175, 239));
        assert_eq!(one_dark.shortcut_theme, Color::Rgb(198, 120, 221));
        assert_eq!(one_dark.success, Color::Rgb(152, 195, 121));
    }

    #[test]
    fn legacy_green_theme_uses_full_surface_palette() {
        let theme = Theme::from_name(ThemeName::Green);

        assert_eq!(theme.background, Color::Rgb(13, 31, 23));
        assert_eq!(theme.border, Color::Rgb(48, 86, 61));
        assert_eq!(theme.selection, Color::Rgb(26, 48, 34));
        assert_eq!(theme.success, Color::Rgb(64, 196, 99));
        assert_eq!(theme.info, Color::Rgb(126, 229, 229));
        assert_eq!(theme.warning, Color::Rgb(155, 233, 168));
        assert_eq!(theme.token_input, Color::Rgb(155, 233, 168));
        assert_eq!(theme.token_output, Color::Rgb(64, 196, 99));
        assert_eq!(theme.token_cache_read, Color::Rgb(126, 229, 229));
        assert_eq!(theme.token_cache_write, Color::Rgb(48, 161, 78));
        assert_eq!(theme.shortcut_sort, Color::Rgb(126, 229, 229));
        assert_eq!(theme.shortcut_theme, Color::Rgb(64, 196, 99));
        assert_eq!(theme.stripe, Color::Rgb(16, 36, 26));
        assert_eq!(theme.today, Color::Rgb(24, 52, 36));
    }

    #[test]
    fn legacy_themes_have_distinct_full_surface_palettes() {
        let green = Theme::from_name(ThemeName::Green);
        let orange = Theme::from_name(ThemeName::Orange);
        let purple = Theme::from_name(ThemeName::Purple);

        assert_ne!(green.background, Color::Rgb(13, 17, 23));
        assert_ne!(orange.background, Color::Rgb(13, 17, 23));
        assert_ne!(purple.background, Color::Rgb(13, 17, 23));

        assert_ne!(green.background, orange.background);
        assert_ne!(orange.background, purple.background);
        assert_ne!(green.background, purple.background);

        assert_ne!(green.selection, Color::Rgb(48, 54, 61));
        assert_ne!(orange.selection, Color::Rgb(48, 54, 61));
        assert_ne!(purple.selection, Color::Rgb(48, 54, 61));

        assert_ne!(green.shortcut_theme, Color::Magenta);
        assert_ne!(orange.shortcut_theme, Color::Magenta);
        assert_ne!(purple.shortcut_theme, Color::Magenta);
    }

    #[test]
    fn gtuvbox_theme_uses_gruvbox_inspired_palette() {
        let theme = Theme::from_name(ThemeName::Gtuvbox);

        assert_eq!(theme.name, ThemeName::Gtuvbox);
        assert_eq!(
            theme.colors,
            [
                Color::Rgb(40, 40, 40),
                Color::Rgb(184, 187, 38),
                Color::Rgb(250, 189, 47),
                Color::Rgb(215, 153, 33),
                Color::Rgb(251, 73, 52),
            ]
        );
        assert_eq!(theme.background, Color::Rgb(50, 48, 47));
        assert_eq!(theme.foreground, Color::Rgb(235, 219, 178));
        assert_eq!(theme.border, Color::Rgb(102, 92, 84));
        assert_eq!(theme.highlight, Color::Rgb(251, 73, 52));
        assert_eq!(theme.muted, Color::Rgb(168, 153, 132));
        assert_eq!(theme.accent, Color::Rgb(215, 153, 33));
        assert_eq!(theme.selection, Color::Rgb(80, 73, 69));
        assert_eq!(theme.success, Color::Rgb(184, 187, 38));
        assert_eq!(theme.info, Color::Rgb(131, 165, 152));
        assert_eq!(theme.warning, Color::Rgb(250, 189, 47));
        assert_eq!(theme.token_input, Color::Rgb(184, 187, 38));
        assert_eq!(theme.token_output, Color::Rgb(251, 73, 52));
        assert_eq!(theme.token_cache_read, Color::Rgb(131, 165, 152));
        assert_eq!(theme.token_cache_write, Color::Rgb(215, 153, 33));
        assert_eq!(theme.shortcut_sort, Color::Rgb(131, 165, 152));
        assert_eq!(theme.shortcut_theme, Color::Rgb(250, 189, 47));
        assert_eq!(theme.stripe, Color::Rgb(60, 56, 54));
        assert_eq!(theme.today, Color::Rgb(69, 133, 136));
    }
}
