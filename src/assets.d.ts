/* Copyright 2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

/*
 * The asset info dictionary, used to find and load assets.  The
 * dictionary is produced by the build system and loaded by a separate
 * script.
 */

declare module Assets {
	interface FontInfo {
		name: string;
		bold: boolean;
		italic: boolean;
		size: number;
		ascender: number;
		descender: number;
		height: number;
		char: string;
		glyphcount: number;
		glyph: Int16Array; // initially a string
		kern: Int8Array; // initially a string
	}

	interface ImageSetInfo {
		[name: string]: string;
	}

	interface SpriteMap {
		[name: string]: number[];
	}

	interface AssetInfo {
		fonts: FontInfo[];
		images: ImageSetInfo;
		sprites: SpriteMap;
	}
}

declare var AssetInfo: Assets.AssetInfo;
