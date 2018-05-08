# -*- coding: UTF-8 -*-
# Copyright (c) 2018, Xycart
# License: MIT License

from __future__ import unicode_literals

import sys, os     # standard modules
from dxfGenerator import dxfGenerator
import ConvertPingYin

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
ATD_DIR     = os.path.dirname(SCRIPTS_DIR)

CADINFOS_DIR = ATD_DIR + '/CadInfos/Allegro17.0'
LIBRARYS_DIR = ATD_DIR + '/Library/Allegro'

BATCH_LATEST_CMD = \
"""call @WORKDIR@/CustomVectorTextMechanicalSymbol.bat
"""

def SaveFile(string, fname):
    with open(fname, "w") as textFile:
        textFile.write(string)

def CreateFile(string, fname, overwrite=True):
    if overwrite:
        SaveFile(string, fname)
    else:
        if not os.path.exists(fname):
            SaveFile(string, fname)

def scrGenerator(dxffile, symbolname):
    scr_srcdir = CADINFOS_DIR + '/CustomVectorTextMechanicalSymbol.scr'
    scr_dstdir = LIBRARYS_DIR + '/atd-' + symbolname + '/CustomVectorTextMechanicalSymbol.scr'
    origfn = scr_srcdir
    targfn = scr_dstdir

    with open(origfn, 'r') as ifile, open(targfn, 'w') as ofile:
        content = ifile.read().replace('@SYMBOL_NAME@', symbolname[:32]).replace('@IMPORT_DXFFILE@', dxffile)
        ofile.write(content)

def batGenerator(scrname, symbolname):
    scr_srcdir = CADINFOS_DIR + '/CustomVectorTextMechanicalSymbol.bat'
    scr_dstdir = LIBRARYS_DIR + '/atd-' + symbolname + '/CustomVectorTextMechanicalSymbol.bat'
    origfn = scr_srcdir
    targfn = scr_dstdir

    with open(origfn, 'r') as ifile, open(targfn, 'w') as ofile:
        content = ifile.read().replace('@SYMBOL_NAME@', symbolname).replace('@SCR_NAME@', scrname)
        ofile.write(content)

def draGenerator(dxffile, symbolname):
    scrGenerator(dxffile, symbolname)
    batGenerator('CustomVectorTextMechanicalSymbol', symbolname)
    
    workdir = LIBRARYS_DIR + '/atd-' + symbolname
    CreateFile(BATCH_LATEST_CMD.replace('@WORKDIR@', workdir), 
        LIBRARYS_DIR + '/RunLatestGenerator.bat', 
        overwrite=True)
    

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    # Create Arguments
    parser.add_argument('--text', '-t', dest='text',
                        help='The vector text you want')
    args = parser.parse_args()
    
    if args.text is None:
    	  text = "博大精深"
    else:
    	  text = args.text.decode('gb2312')
    
    #print sys.getdefaultencoding()
    #print text
    textpy = ConvertPingYin.CConvert().convert(text) # .replace('-','')
    
    symbolname = textpy
    dxf_dstdir = LIBRARYS_DIR + '/atd-' + symbolname
    dxffn    = dxf_dstdir + "/atd-" + symbolname + ".dxf"
    expdxffn = dxffn.split('.')[0] + ".exp.dxf"
    dxffile  = expdxffn
    dxferror = dxfGenerator(text)
    if dxferror:
    	  print ("#### Error on dxfGenerator(%s)" % text)
    draGenerator(dxffile, symbolname)
